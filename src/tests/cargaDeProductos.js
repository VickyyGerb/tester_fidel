// TEST: Carga de Productos.
// "meta" describe la vista y qué campos pide el formulario del launcher.
// "run(ctx)" es el flujo real; ctx = { page, context, browser, vars, log }.
const { login } = require("../paginas/login");

const meta = {
  nombre: "Carga de Productos",
  descripcion: "Loguea, abre un documento de compra y carga un producto.",
  campos: [
    { nombre: "urlBase", etiqueta: "URL del sistema", tipo: "text", requerido: true, valor: "https://" },
    { nombre: "email", etiqueta: "Email", tipo: "text", requerido: true },
    { nombre: "password", etiqueta: "Contraseña", tipo: "password", requerido: true },
    { nombre: "cuentaId", etiqueta: "ID de cuenta", tipo: "number", requerido: true },
    { nombre: "proveedor", etiqueta: "Número de proveedor", tipo: "number", requerido: false },
    { nombre: "producto", etiqueta: "Código de producto", tipo: "text", requerido: false },
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

  log(`Proveedor: ${vars.proveedor || "(ninguno)"} | Producto: ${vars.producto || "(ninguno)"}`);

  // TODO: portar acá el flujo real de carga (equivalente a paginas/documents.js
  // + componentes/productLoader.js de tu ejemplo). Por ahora solo valida el login.
  log("Pendiente: completar el flujo de carga de producto.");
}

module.exports = { meta, run };
