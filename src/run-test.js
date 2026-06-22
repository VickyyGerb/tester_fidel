// Runner genérico: corre UN test (una vista) pasándole las variables del formulario.
// Uso:  node src/run-test.js <nombreDelTest>
// Las variables llegan como env VAR_<campo> (las setea el launcher) y se entregan
// al test ya "limpias" dentro de ctx.vars.
require("dotenv").config();
const path = require("path");
const fs = require("fs");
const { chromium } = require("@playwright/test");

const TESTS_DIR = path.join(__dirname, "tests");

function collectVars() {
  // Toma todo lo que el launcher mandó como VAR_<campo> y lo expone como { campo: valor }.
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

  if (!name) {
    console.error("Falta el nombre del test. Uso: node src/run-test.js <nombreDelTest>");
    process.exit(2);
  }

  const file = path.join(TESTS_DIR, `${name}.js`);
  if (!fs.existsSync(file)) {
    console.error(`No existe el test "${name}" (${file}).`);
    process.exit(2);
  }

  const mod = require(file);
  if (typeof mod.run !== "function") {
    console.error(`El test "${name}" no exporta una función run(ctx).`);
    process.exit(2);
  }

  const headless = process.env.HEADLESS === "1";
  const slowMo = Number(process.env.SLOWMO || 80);
  const keepOpen = process.env.KEEP_OPEN === "1";

  log(`Iniciando test "${name}" (headless=${headless}, slowMo=${slowMo})...`);
  const browser = await chromium.launch({
    headless,
    slowMo,
    args: ["--start-maximized"],
  });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  let code = 0;
  try {
    await mod.run({ page, context, browser, vars: collectVars(), log });
    log("✓ Test finalizado OK");
  } catch (err) {
    code = 1;
    log("✗ Test FALLÓ: " + (err && err.stack ? err.stack : err));
  } finally {
    if (keepOpen) {
      log("KEEP_OPEN=1 → navegador abierto. Cerralo a mano cuando termines de inspeccionar.");
    } else {
      await browser.close();
    }
  }
  process.exit(code);
}

main();
