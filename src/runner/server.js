// Servidor del launcher.
//  - Sirve la UI (carpeta /launcher).
//  - GET  /api/tests  -> lista los tests disponibles con su "meta" (para armar el form).
//  - POST /api/run    -> corre el test elegido con las variables del form y
//                        transmite stdout/stderr en vivo (Server-Sent Events).
require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const ROOT = path.join(__dirname, "..", "..");
const TESTS_DIR = path.join(__dirname, "..", "tests");
const RUNNER = path.join(__dirname, "..", "run-test.js");

const app = express();
app.use(express.json());
app.use(express.static(path.join(ROOT, "launcher")));

function loadTestsMeta() {
  return fs
    .readdirSync(TESTS_DIR)
    .filter((f) => f.endsWith(".js") && !f.startsWith("_"))
    .map((f) => {
      const id = f.replace(/\.js$/, "");
      // require fresco para reflejar cambios sin reiniciar el server.
      delete require.cache[require.resolve(path.join(TESTS_DIR, f))];
      const mod = require(path.join(TESTS_DIR, f));
      if (!mod.meta) return null;
      return { id, ...mod.meta };
    })
    .filter(Boolean);
}

app.get("/api/tests", (req, res) => {
  try {
    res.json(loadTestsMeta());
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
});

const SCRIPTS_DIR = path.join(ROOT, "scripts");

// Abre un stream SSE y vuelca stdout/stderr de un proceso hijo en vivo.
function streamProcess(req, res, cmd, argv, env) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (event, data) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  const child = spawn(cmd, argv, { env: env || process.env, cwd: ROOT });
  child.stdout.on("data", (d) => send("log", d.toString()));
  child.stderr.on("data", (d) => send("log", d.toString()));
  child.on("close", (code) => {
    send("done", { code });
    res.end();
  });
  child.on("error", (err) => {
    send("log", "Error lanzando el proceso: " + err.message + "\n");
    send("done", { code: 1 });
    res.end();
  });

  // Si el navegador cierra la pestaña, matamos el proceso.
  req.on("close", () => child.kill());
}

function psArgs(script, extra = []) {
  return ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(SCRIPTS_DIR, script), ...extra];
}

// Correr un test (una vista) con las variables del formulario.
app.post("/api/run", (req, res) => {
  const { test, vars = {} } = req.body || {};
  if (!test) return res.status(400).json({ error: "Falta el test a correr." });
  const env = { ...process.env };
  for (const [k, v] of Object.entries(vars)) env[`VAR_${k}`] = String(v ?? "");
  streamProcess(req, res, process.execPath, [RUNNER, test], env);
});

// Traer la última versión del repo (git pull + deps).
app.post("/api/actualizar", (req, res) => {
  streamProcess(req, res, "powershell.exe", psArgs("actualizar.ps1"));
});

// Commit + push. Requiere confirmación explícita "GUARDAR" (el HTML la pide).
app.post("/api/guardar", (req, res) => {
  const { mensaje, confirmacion } = req.body || {};
  if (confirmacion !== "GUARDAR") {
    res.setHeader("Content-Type", "text/event-stream");
    res.flushHeaders();
    res.write(`event: log\ndata: ${JSON.stringify("Cancelado: confirmación inválida.\n")}\n\n`);
    res.write(`event: done\ndata: ${JSON.stringify({ code: 1 })}\n\n`);
    return res.end();
  }
  const extra = ["-SinConfirmar"];
  if (mensaje) extra.push("-Mensaje", String(mensaje));
  streamProcess(req, res, "powershell.exe", psArgs("guardar.ps1", extra));
});

// Estado de conexión a GitHub (gh). Devuelve el usuario si está conectado.
app.get("/api/github/estado", (req, res) => {
  const child = spawn("gh", ["api", "user", "--jq", ".login"]);
  let out = "";
  child.stdout.on("data", (d) => (out += d.toString()));
  child.on("close", (code) => {
    if (code === 0 && out.trim()) res.json({ conectado: true, usuario: out.trim() });
    else res.json({ conectado: false });
  });
  child.on("error", () => res.json({ conectado: false, error: "gh no encontrado" }));
});

// Abre una consola real para el login de gh (necesita TTY). Devuelve enseguida.
app.post("/api/github/conectar", (req, res) => {
  const script = path.join(SCRIPTS_DIR, "conectar-github.ps1");
  const child = spawn(
    "cmd",
    ["/c", "start", "", "powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script],
    { detached: true, windowsHide: false }
  );
  child.on("error", (err) => {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  });
  child.unref();
  res.json({ ok: true });
});

const PORT = process.env.PORT || 4599;
app.listen(PORT, () => {
  console.log(`Launcher levantado en http://localhost:${PORT}`);
});
