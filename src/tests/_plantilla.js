// PLANTILLA para una vista nueva.
// 1) Copiá este archivo a "src/tests/miVista.js" (sin el guion bajo inicial; los
//    archivos que empiezan con "_" NO aparecen en el launcher).
// 2) Ajustá "meta" (nombre, descripción y los campos que necesite la vista).
// 3) Escribí el flujo en "run".
const { login } = require("../paginas/login");
const { OPCIONES_AMBIENTE, resolverAmbiente } = require("../config/ambientes");

const meta = {
  nombre: "Mi Vista (cambiá esto)",
  descripcion: "Describí qué prueba este test.",
  campos: [
    { nombre: "ambiente", etiqueta: "Ambiente", tipo: "select", requerido: true, opciones: OPCIONES_AMBIENTE, valor: "dev" },
    { nombre: "email", etiqueta: "Email", tipo: "text", requerido: true },
    { nombre: "password", etiqueta: "Contraseña", tipo: "password", requerido: true },
    { nombre: "cuentaId", etiqueta: "ID de cuenta", tipo: "number", requerido: true },
    // Agregá acá las variables propias de esta vista:
    // { nombre: "miCampo", etiqueta: "Mi campo", tipo: "text", requerido: false, valor: "" },
  ],
};

async function run({ page, vars, log }) {
  const amb = resolverAmbiente(vars.ambiente);

  await login(page, {
    urlBase: amb.loginUrl,
    email: vars.email,
    password: vars.password,
    cuentaId: vars.cuentaId,
    log,
  });

  // Tu flujo acá. La raíz del sistema del ambiente elegido es `amb.base`. Ejemplo:
  // await page.goto(`${amb.base}/Sistema/Venta/Lista`);
  // await page.getByRole("button", { name: "Nuevo" }).click();

  log("Plantilla sin implementar. Escribí el flujo de tu vista.");
}

module.exports = { meta, run };
