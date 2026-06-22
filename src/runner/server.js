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
app.use("/capturas", express.static(path.join(ROOT, "capturas")));

const HISTORIAL = path.join(ROOT, "historial.json");
function leerHistorial() {
  try { return JSON.parse(fs.readFileSync(HISTORIAL, "utf8")); } catch (_) { return []; }
}
function guardarEnHistorial(item) {
  const h = leerHistorial();
  h.unshift(item);
  try { fs.writeFileSync(HISTORIAL, JSON.stringify(h.slice(0, 100), null, 2)); } catch (_) {}
}
function leerResultado(runId) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, "capturas", runId, "resultado.json"), "utf8")); } catch (_) { return null; }
}

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
function streamProcess(req, res, cmd, argv, env, matarAlCerrar = true, onDone = null) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (event, data) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  let terminado = false;
  const finalizar = (code) => {
    if (terminado) return;
    terminado = true;
    send("done", { code });
    res.end();
    if (onDone) onDone(code);
  };

  const child = spawn(cmd, argv, { env: env || process.env, cwd: ROOT });
  child.stdout.on("data", (d) => send("log", d.toString()));
  child.stderr.on("data", (d) => send("log", d.toString()));
  // code null = el proceso murió por señal (lo reportamos como 1, no como null).
  child.on("close", (code) => finalizar(code == null ? 1 : code));
  child.on("error", (err) => {
    send("log", "Error lanzando el proceso: " + err.message + "\n");
    finalizar(1);
  });

  // Si el cliente ABANDONA (cierra la pestaña) antes de terminar, cancelamos el
  // proceso. Escuchamos res (no req) + guardia "terminado" para NO cortar por el
  // fin normal de la request (ese era el bug del "código null").
  if (matarAlCerrar) {
    res.on("close", () => {
      if (!terminado) child.kill();
    });
  }
}

function psArgs(script, extra = []) {
  return ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(SCRIPTS_DIR, script), ...extra];
}

// Correr un test (una vista) con variables + opciones de ejecución. Al terminar,
// lee el resultado estructurado (capturas/<runId>/resultado.json), lo manda por
// el evento "resultado" y lo agrega al historial.
app.post("/api/run", (req, res) => {
  const { test, vars = {}, opciones = {} } = req.body || {};
  if (!test) return res.status(400).json({ error: "Falta el test a correr." });

  const runId = String(Date.now());
  const env = { ...process.env, RUN_ID: runId };
  for (const [k, v] of Object.entries(vars)) env[`VAR_${k}`] = String(v ?? "");
  if (opciones.headless != null) env.HEADLESS = opciones.headless ? "1" : "0";
  if (opciones.slowMo != null && opciones.slowMo !== "") env.SLOWMO = String(opciones.slowMo);
  if (opciones.keepOpen != null) env.KEEP_OPEN = opciones.keepOpen ? "1" : "0";
  if (opciones.capturas) env.CAPTURAS = String(opciones.capturas);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  let terminado = false;
  const child = spawn(process.execPath, [RUNNER, test], { env, cwd: ROOT });
  child.stdout.on("data", (d) => send("log", d.toString()));
  child.stderr.on("data", (d) => send("log", d.toString()));
  child.on("close", (code) => {
    if (terminado) return;
    terminado = true;
    const resultado = leerResultado(runId);
    if (resultado) {
      resultado.fecha = new Date().toISOString();
      guardarEnHistorial(resultado);
      send("resultado", resultado);
    }
    send("done", { code: code == null ? 1 : code });
    res.end();
  });
  child.on("error", (err) => {
    if (terminado) return;
    terminado = true;
    send("log", "Error lanzando el runner: " + err.message + "\n");
    send("done", { code: 1 });
    res.end();
  });
  res.on("close", () => { if (!terminado) child.kill(); });
});

// Historial de corridas (más recientes primero).
app.get("/api/historial", (req, res) => res.json(leerHistorial().slice(0, 30)));

// Health check para que el cliente sepa cuándo el server volvió tras reiniciar.
app.get("/api/ping", (req, res) => res.json({ ok: true }));

// Traer la última versión del repo (git pull + deps) y REINICIAR el server para
// tomar cambios de server.js (el supervisor lo relanza al salir con código 99).
app.post("/api/actualizar", (req, res) => {
  streamProcess(req, res, "powershell.exe", psArgs("actualizar.ps1"), null, false, () => {
    setTimeout(() => process.exit(99), 600);
  });
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
  streamProcess(req, res, "powershell.exe", psArgs("guardar.ps1", extra), null, false);
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

// Al reiniciar, el puerto puede tardar un instante en liberarse: reintentamos.
function escuchar(intentos = 0) {
  const server = app.listen(PORT, () => {
    console.log(`Launcher levantado en http://localhost:${PORT}`);
  });
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE" && intentos < 10) {
      setTimeout(() => escuchar(intentos + 1), 400);
    } else {
      console.error("No se pudo levantar el launcher:", err.message);
      process.exit(1);
    }
  });
}

escuchar();
