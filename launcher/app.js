// Lógica del launcher: carga los tests, arma el formulario según el "meta"
// de cada vista, y corre el test mostrando el log en vivo.
const $ = (sel) => document.querySelector(sel);
const selTest = $("#test");
const descripcion = $("#descripcion");
const form = $("#form");
const logEl = $("#log");
const estado = $("#estado");
const btnRun = $("#run");
const btnActualizar = $("#actualizar");
const btnGuardar = $("#guardar");
const btnConectar = $("#conectar");
const btnDetener = $("#detener");
const githubEstado = $("#github-estado");

let tests = [];
let corriendo = false;
let githubOk = false;
let abortCtl = null;

function setEstado(texto, clase) {
  estado.textContent = texto;
  estado.className = "badge" + (clase ? " " + clase : "");
}

function refrescarBotones() {
  btnRun.disabled = corriendo;
  btnActualizar.disabled = corriendo;
  btnConectar.disabled = corriendo;
  // Detener solo tiene sentido mientras algo corre.
  btnDetener.disabled = !corriendo;
  // Guardar requiere estar conectado a GitHub.
  btnGuardar.disabled = corriendo || !githubOk;
}

function appendLog(texto) {
  logEl.textContent += texto;
  logEl.scrollTop = logEl.scrollHeight;
}

// Recuerda lo último cargado por campo (por test) para no retipear cada vez.
function recordar(testId, vars) {
  try {
    localStorage.setItem("fidel-tester:" + testId, JSON.stringify(vars));
  } catch (_) {}
}
function recordado(testId) {
  try {
    return JSON.parse(localStorage.getItem("fidel-tester:" + testId) || "{}");
  } catch (_) {
    return {};
  }
}

function renderForm(test) {
  descripcion.textContent = test.descripcion || "";
  const previos = recordado(test.id);
  form.innerHTML = "";
  let grupoActual = null;

  for (const campo of test.campos || []) {
    // Encabezado de sección cuando cambia el grupo.
    if (campo.grupo && campo.grupo !== grupoActual) {
      grupoActual = campo.grupo;
      const h = document.createElement("div");
      h.className = "grupo";
      h.textContent = campo.grupo;
      form.appendChild(h);
    }

    const prev = previos[campo.nombre];

    // Checkbox (SÍ/NO): etiqueta al lado del control.
    if (campo.tipo === "checkbox") {
      const wrap = document.createElement("label");
      wrap.className = "check";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = campo.nombre;
      input.dataset.tipo = "checkbox";
      input.checked = prev != null ? prev === "SI" : String(campo.valor).toUpperCase() === "SI";
      const span = document.createElement("span");
      span.textContent = campo.etiqueta || campo.nombre;
      wrap.appendChild(input);
      wrap.appendChild(span);
      form.appendChild(wrap);
      continue;
    }

    const label = document.createElement("label");
    label.textContent = campo.etiqueta || campo.nombre;
    if (campo.requerido) {
      const req = document.createElement("span");
      req.className = "req";
      req.textContent = " *";
      label.appendChild(req);
    }
    form.appendChild(label);

    let input;
    if (campo.tipo === "select") {
      input = document.createElement("select");
      for (const op of campo.opciones || []) {
        const o = document.createElement("option");
        o.value = op;
        o.textContent = op === "" ? "(ninguno)" : op;
        input.appendChild(o);
      }
    } else {
      input = document.createElement("input");
      input.type = campo.tipo === "password" ? "password" : campo.tipo === "number" ? "number" : "text";
    }
    input.name = campo.nombre;
    input.value = prev ?? campo.valor ?? "";
    if (campo.requerido) input.required = true;
    form.appendChild(input);
  }
}

function leerVars() {
  const vars = {};
  for (const el of form.querySelectorAll("input, select")) {
    vars[el.name] = el.dataset.tipo === "checkbox" ? (el.checked ? "SI" : "NO") : el.value;
  }
  return vars;
}

function validar() {
  for (const el of form.querySelectorAll("input[required], select[required]")) {
    if (!el.value.trim()) {
      el.focus();
      appendLog(`\n⚠ Falta completar un campo obligatorio.\n`);
      return false;
    }
  }
  return true;
}

// Corre un POST con respuesta en streaming (SSE) y vuelca el log en vivo.
async function stream(url, body, etiqueta) {
  corriendo = true;
  refrescarBotones();
  setEstado("corriendo…", "run");
  appendLog(`\n──────── ${new Date().toLocaleTimeString()} · ${etiqueta} ────────\n`);

  abortCtl = new AbortController();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: abortCtl.signal,
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sep;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const raw = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        procesarEvento(raw);
      }
    }
  } catch (err) {
    if (err.name === "AbortError") {
      appendLog("\n⏹ Detenido por el usuario.\n");
      setEstado("detenido", "err");
    } else {
      appendLog("Error de red: " + err.message + "\n");
      setEstado("error", "err");
    }
  } finally {
    abortCtl = null;
    corriendo = false;
    refrescarBotones();
  }
}

// Corta el test en curso: aborta la conexión y el server mata el Chromium.
function detener() {
  if (abortCtl) {
    appendLog("\nDeteniendo…\n");
    abortCtl.abort();
  }
}

function correr() {
  if (!validar()) return;
  const test = selTest.value;
  const vars = leerVars();
  recordar(test, vars);
  stream("/api/run", { test, vars }, test);
}

function actualizar() {
  stream("/api/actualizar", {}, "actualizar");
}

function guardar() {
  if (!githubOk) {
    appendLog("\nConectá tu cuenta de GitHub primero (botón 🔗 Conectar GitHub).\n");
    return;
  }
  const mensaje = prompt("Mensaje del commit (qué cambiaste):", "");
  if (mensaje === null) return; // canceló
  const conf = prompt(
    "¿Seguro que querés GUARDAR y subir a GitHub?\nEscribí GUARDAR (en mayúsculas) para continuar:"
  );
  if (conf !== "GUARDAR") {
    appendLog("\nGuardar cancelado (no escribiste GUARDAR).\n");
    return;
  }
  stream("/api/guardar", { mensaje, confirmacion: "GUARDAR" }, "guardar");
}

// Consulta si hay una cuenta de GitHub conectada y actualiza el indicador.
async function chequearGitHub() {
  try {
    const r = await (await fetch("/api/github/estado")).json();
    githubOk = !!r.conectado;
    githubEstado.textContent = githubOk ? `GitHub: ${r.usuario}` : "GitHub: sin conectar";
    githubEstado.className = "github " + (githubOk ? "ok" : "off");
  } catch (_) {
    githubOk = false;
  }
  refrescarBotones();
}

// Abre la ventana de login de gh y poolea hasta detectar la conexión.
async function conectar() {
  appendLog("\nAbriendo la ventana de conexión a GitHub… seguí los pasos ahí (se abre el navegador).\n");
  try {
    await fetch("/api/github/conectar", { method: "POST" });
  } catch (err) {
    appendLog("No se pudo abrir la conexión: " + err.message + "\n");
    return;
  }
  const iv = setInterval(async () => {
    await chequearGitHub();
    if (githubOk) {
      clearInterval(iv);
      appendLog(`✓ GitHub conectado como ${githubEstado.textContent.replace("GitHub: ", "")}. Ya podés Guardar.\n`);
    }
  }, 2500);
  setTimeout(() => clearInterval(iv), 180000); // corta el poll a los 3 min
}

function procesarEvento(raw) {
  let evento = "message";
  let data = "";
  for (const linea of raw.split("\n")) {
    if (linea.startsWith("event:")) evento = linea.slice(6).trim();
    else if (linea.startsWith("data:")) data += linea.slice(5).trim();
  }
  if (!data) return;
  const payload = JSON.parse(data);

  if (evento === "log") {
    appendLog(payload);
  } else if (evento === "done") {
    if (payload.code === 0) setEstado("OK", "ok");
    else setEstado("falló (código " + payload.code + ")", "err");
  }
}

async function init() {
  try {
    tests = await (await fetch("/api/tests")).json();
  } catch (err) {
    appendLog("No se pudieron cargar los tests: " + err.message + "\n");
    return;
  }
  if (!tests.length) {
    appendLog("No hay tests en src/tests/. Creá uno a partir de _plantilla.js\n");
    return;
  }
  selTest.innerHTML = "";
  for (const t of tests) {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.nombre || t.id;
    selTest.appendChild(opt);
  }
  renderForm(tests[0]);
}

selTest.addEventListener("change", () => {
  renderForm(tests.find((t) => t.id === selTest.value));
});
btnRun.addEventListener("click", correr);
btnActualizar.addEventListener("click", actualizar);
btnGuardar.addEventListener("click", guardar);
btnConectar.addEventListener("click", conectar);
btnDetener.addEventListener("click", detener);
$("#limpiar").addEventListener("click", () => (logEl.textContent = ""));

init();
chequearGitHub();
