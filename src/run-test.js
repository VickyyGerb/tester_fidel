// Runner genérico: corre UN test (una vista) con las variables del formulario.
// Uso:  node src/run-test.js <nombreDelTest>
// - Variables: env VAR_<campo> -> ctx.vars.
// - Opciones de corrida: env HEADLESS, SLOWMO, KEEP_OPEN, CAPTURAS, RUN_ID.
// - Salida estructurada: escribe capturas/<RUN_ID>/resultado.json (lo lee el server).
require("dotenv").config();
const path = require("path");
const fs = require("fs");
const { chromium } = require("@playwright/test");

const ROOT = path.join(__dirname, "..");
const TESTS_DIR = path.join(__dirname, "tests");

function collectVars() {
  const out = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (k.startsWith("VAR_")) out[k.slice(4)] = v;
  }
  return out;
}

function stamp() {
  return new Date().toISOString().slice(11, 23);
}

async function main() {
  const name = process.argv[2] || process.env.TEST_NAME;
  const log = (...a) => console.log(`[${stamp()}]`, ...a);

  if (!name) { console.error("Falta el nombre del test."); process.exit(2); }
  const file = path.join(TESTS_DIR, `${name}.js`);
  if (!fs.existsSync(file)) { console.error(`No existe el test "${name}".`); process.exit(2); }
  const mod = require(file);
  if (typeof mod.run !== "function") { console.error(`El test "${name}" no exporta run(ctx).`); process.exit(2); }

  const headless = process.env.HEADLESS === "1";
  const slowMo = Number(process.env.SLOWMO || 80);
  const keepOpen = process.env.KEEP_OPEN === "1";
  const capturas = (process.env.CAPTURAS || "alfallar").toLowerCase(); // siempre | alfallar | nunca
  const runId = process.env.RUN_ID || String(Date.now());
  const capDir = path.join(ROOT, "capturas", runId);

  const inicio = Date.now();
  log(`Iniciando test "${name}" (headless=${headless}, slowMo=${slowMo})...`);
  const browser = await chromium.launch({ headless, slowMo, args: ["--start-maximized"] });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  const screenshots = [];
  async function capturar(nombre) {
    try {
      fs.mkdirSync(capDir, { recursive: true });
      await page.screenshot({ path: path.join(capDir, `${nombre}.png`) });
      screenshots.push(`/capturas/${runId}/${nombre}.png`);
      log(`📸 Captura: ${nombre}`);
    } catch (e) { log("No pude capturar pantalla: " + e.message); }
  }

  let exito = false;
  let resumen = {};
  let errorMsg = null;
  try {
    const r = await mod.run({ page, context, browser, vars: collectVars(), log, capturar });
    if (r && typeof r === "object") { exito = r.exito !== false; resumen = r.resumen || {}; }
    else exito = true;
    log(exito ? "✓ Test finalizado OK" : "✗ Test con observaciones");
  } catch (err) {
    errorMsg = err && err.stack ? err.stack : String(err);
    log("✗ Test FALLÓ: " + errorMsg);
  }

  if (capturas === "siempre" || (capturas === "alfallar" && !exito)) {
    await capturar(exito ? "final" : "error");
  }

  const resultado = { test: name, runId, exito, error: errorMsg, durationMs: Date.now() - inicio, capturas: screenshots, ...resumen };
  try {
    fs.mkdirSync(capDir, { recursive: true });
    fs.writeFileSync(path.join(capDir, "resultado.json"), JSON.stringify(resultado, null, 2));
  } catch (e) { log("No pude guardar resultado.json: " + e.message); }

  if (keepOpen) log("KEEP_OPEN=1 → navegador abierto. Cerralo a mano cuando termines.");
  else await browser.close();

  process.exit(exito ? 0 : 1);
}

main();
