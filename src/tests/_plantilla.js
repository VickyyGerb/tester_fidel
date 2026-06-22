// PLANTILLA para una vista nueva.
// 1) Copiá este archivo a "src/tests/miVista.js" (sin el guion bajo inicial; los
//    archivos que empiezan con "_" NO aparecen en el launcher).
// 2) Ajustá "meta" (nombre, descripción y los campos que necesite la vista).
// 3) Escribí el flujo en "run".
const { login } = require("../paginas/login");

const meta = {
  nombre: "Mi Vista (cambiá esto)",
  descripcion: "Describí qué prueba este test.",
  campos: [
    { nombre: "urlBase", etiqueta: "URL del sistema", tipo: "text", requerido: true, valor: "https://" },
    { nombre: "email", etiqueta: "Email", tipo: "text", requerido: true },
    { nombre: "password", etiqueta: "Contraseña", tipo: "password", requerido: true },
    { nombre: "cuentaId", etiqueta: "ID de cuenta", tipo: "number", requerido: true },
    // Agregá acá las variables propias de esta vista:
    // { nombre: "miCampo", etiqueta: "Mi campo", tipo: "text", requerido: false, valor: "" },
  ],
};

async function run({ page, vars, log }) {
  await login(page, {
    urlBase: vars.urlBase,
    email: vars.email,
    password: vars.password,
    cuentaId: vars.cuentaId,
    log,
  });

  // Tu flujo acá. Ejemplo:
  // await page.goto(`${vars.urlBase}venta/lista`);
  // await page.getByRole("button", { name: "Nuevo" }).click();

  log("Plantilla sin implementar. Escribí el flujo de tu vista.");
}

module.exports = { meta, run };
