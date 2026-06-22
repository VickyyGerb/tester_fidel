// TEST: Carga de Productos.
// Los campos del formulario espejan las columnas del Excel de casos de prueba.
// run() arma el objeto "caso" con la MISMA forma que googleSheetsReader.js, así
// el flujo real (referencia/cargaDeProductos) se enchufa sin reescribir nada.
const { login } = require("../paginas/login");
const { correrCaso } = require("../flujos/cargaProductos");

const meta = {
  nombre: "Carga de Productos",
  descripcion: "Loguea y prueba la carga de un producto por los métodos elegidos.",
  campos: [
    // --- Acceso ---
    { nombre: "urlBase", etiqueta: "URL de login", tipo: "text", requerido: true, valor: "https://dev.fidel.com.ar/", ayuda: "La página donde ponés email y contraseña. NO la URL del documento.", grupo: "Acceso" },
    { nombre: "email", etiqueta: "Email", tipo: "text", requerido: true, grupo: "Acceso" },
    { nombre: "password", etiqueta: "Contraseña", tipo: "password", requerido: true, grupo: "Acceso" },

    // --- Caso ---
    { nombre: "cuentaId", etiqueta: "CuentaID", tipo: "number", requerido: true, grupo: "Caso" },
    { nombre: "documento", etiqueta: "Documento", tipo: "text", requerido: true, valor: "factura", ayuda: "factura, presupuesto, pedido, remito o venta_unificada. El script abre la pantalla solo.", grupo: "Caso" },
    { nombre: "clienteId", etiqueta: "ClienteID", tipo: "text", requerido: false, grupo: "Caso" },

    // --- Producto ---
    { nombre: "productoCodigo", etiqueta: "Código interno", tipo: "text", requerido: false, grupo: "Producto" },
    { nombre: "productoCodigoBarra", etiqueta: "Código de barra", tipo: "text", requerido: false, grupo: "Producto" },

    // --- Métodos a probar (SÍ/NO) ---
    { nombre: "probarManual", etiqueta: "Carga manual", tipo: "checkbox", valor: "SI", grupo: "Métodos a probar" },
    { nombre: "probarCodigoBarra", etiqueta: "Código de barra", tipo: "checkbox", valor: "NO", grupo: "Métodos a probar" },
    { nombre: "probarAsignMultiple", etiqueta: "Asignación múltiple", tipo: "checkbox", valor: "NO", grupo: "Métodos a probar" },
    { nombre: "probarPlantilla", etiqueta: "Plantilla", tipo: "checkbox", valor: "NO", grupo: "Métodos a probar" },
    { nombre: "plantillaNombre", etiqueta: "Nombre de plantilla", tipo: "text", requerido: false, grupo: "Métodos a probar" },

    // --- Configuraciones ---
    { nombre: "listaPrecios", etiqueta: "Lista de precios", tipo: "text", requerido: false, grupo: "Configuraciones" },
    { nombre: "moneda", etiqueta: "Moneda", tipo: "select", opciones: ["", "Peso", "Dólar"], requerido: false, grupo: "Configuraciones" },
    { nombre: "cotizacion", etiqueta: "Cotización", tipo: "number", requerido: false, grupo: "Configuraciones" },
    { nombre: "descuentoItem", etiqueta: "Descuento por ítem", tipo: "text", requerido: false, grupo: "Configuraciones" },
    { nombre: "alicuota", etiqueta: "Alícuota", tipo: "text", requerido: false, grupo: "Configuraciones" },
    { nombre: "descuentoGlobal", etiqueta: "Descuento global", tipo: "text", requerido: false, grupo: "Configuraciones" },
  ],
};

const siNo = (v) => String(v).toUpperCase() === "SI";

function limpiarConfig(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v != null && String(v).trim() !== "") out[k] = String(v).trim();
  }
  return out;
}

async function run({ page, vars, log }) {
  // Mismo shape que googleSheetsReader.leerCasosDePrueba -> casos[i].
  const caso = {
    cuentaID: vars.cuentaId || "",
    documento: (vars.documento || "").toLowerCase(),
    clienteID: vars.clienteId || "",
    producto: {
      codigoInterno: vars.productoCodigo || "",
      codigoBarra: vars.productoCodigoBarra || "",
    },
    probarMetodos: {
      manual: siNo(vars.probarManual),
      codigoBarra: siNo(vars.probarCodigoBarra),
      asignMultiple: siNo(vars.probarAsignMultiple),
      plantilla: siNo(vars.probarPlantilla),
    },
    plantillaNombre: vars.plantillaNombre || null,
    configuraciones: limpiarConfig({
      lista_precios: vars.listaPrecios,
      moneda: vars.moneda,
      cotizacion: vars.cotizacion,
      descuento_item: vars.descuentoItem,
      alicuota: vars.alicuota,
      descuento_global: vars.descuentoGlobal,
    }),
  };

  if (!Object.values(caso.probarMetodos).some(Boolean)) {
    throw new Error("Marcá al menos un método a probar (manual, código de barra, etc.).");
  }
  if (caso.probarMetodos.plantilla && !caso.plantillaNombre) {
    throw new Error("Marcaste 'Plantilla' pero falta el nombre de la plantilla.");
  }

  log("Caso a probar:\n" + JSON.stringify(caso, null, 2));

  await login(page, {
    urlBase: vars.urlBase,
    email: vars.email,
    password: vars.password,
    cuentaId: caso.cuentaID,
    log,
  });

  // Flujo real: navegar al documento, cargar por cada método, aplicar
  // configuraciones, verificar precios y guardar.
  const r = await correrCaso(page, caso, { confirmarGuardado: true });

  log("");
  log(`RESULTADO: ${r.exito ? "✓ OK" : "✗ con observaciones"}`);
  log(`  Métodos cargados: ${r.tiposCarga.join(", ") || "-"}`);
  log(`  Precio antes: ${r.precioAntes}  |  después: ${r.precioDespues}`);
  log(`  Guardado: ${r.guardado.estado}${r.guardado.mensaje ? " (" + r.guardado.mensaje + ")" : ""}`);
  if (!r.exito) throw new Error("El caso terminó con observaciones (ver detalle arriba).");
}

module.exports = { meta, run };
