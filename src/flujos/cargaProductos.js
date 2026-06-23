// Flujo de Carga de Productos para UN caso (portado de referencia/test-rapido.js).
// Asume que el login YA se hizo. Recibe page + caso (shape de googleSheetsReader).
// Devuelve un resumen { exito, guardado, ... }. Usa console.log: la salida sale
// por stdout y el launcher la muestra en vivo.
const { DocumentsPage } = require("../paginas/documents");
const { ProductLoader } = require("../componentes/productLoader");
const { ConfigApplier } = require("../componentes/configApplier");
const { leerLineasProducto } = require("../utiles/lecturaPrecios");

async function correrCaso(page, caso, { confirmarGuardado = true, base } = {}) {
  const mets = caso.probarMetodos;
  let exito = false;
  let reglaDescuentoOk = true;
  let guardado = { intentado: false, estado: "desconocido", mensaje: "" };
  let configsAplicadas = {};
  const nombreMetodo = { manual: "Manual", codigoBarra: "Código de barra", asignMultiple: "Asignación múltiple", plantilla: "Plantilla" };
  const fmtPrecios = (arr) => (arr.length ? [...new Set(arr)].map((n) => "$" + Number(n).toLocaleString("es-AR")).join(", ") : "-");

  const documentsPage = new DocumentsPage(page, caso.documento, base);
  console.log(`📍 URL tras login: ${page.url()}`);
  await documentsPage.navegar(caso.documento);
  console.log(`✅ Navegó a ${caso.documento} -> ${page.url()}`);

  if (caso.clienteID && caso.clienteID !== "") {
    console.log(`👤 Seleccionando cliente ${caso.clienteID}...`);
    await documentsPage.seleccionarCliente(caso.clienteID);
    console.log(`✅ Cliente ${caso.clienteID} seleccionado`);
  }

  const productLoader = new ProductLoader(page, caso.documento);
  const preciosAntes = [];

  console.log("\n📦 Cargando productos SIN configuraciones:");

  if (mets.manual && caso.producto.codigoInterno) {
    try {
      console.log("📦 Probando carga manual...");
      const precio = await productLoader.cargarManual(caso.producto.codigoInterno);
      if (precio > 0) { preciosAntes.push({ metodo: "manual", precio }); console.log(`   ✅ Precio: ${precio}`); }
      else console.log("   ⚠️ Manual no cargó el producto — se OMITE de la comparación");
    } catch (e) { console.log(`   ❌ Error en manual: ${e.message}`); }
    await page.waitForTimeout(500);
  }

  if (mets.codigoBarra && caso.producto.codigoBarra) {
    try {
      console.log("📷 Probando código de barra...");
      const precio = await productLoader.cargarPorCodigoBarra(caso.producto.codigoBarra);
      if (precio > 0) { preciosAntes.push({ metodo: "codigoBarra", precio }); console.log(`   ✅ Precio: ${precio}`); }
      else console.log("   ⚠️ Código de barra no cargó el producto — se OMITE de la comparación");
    } catch (e) { console.log(`   ❌ Error en código de barra: ${e.message}`); }
    await page.waitForTimeout(500);
  }

  if (mets.asignMultiple && caso.producto.codigoInterno) {
    try {
      console.log("📋 Probando asignación múltiple...");
      const precio = await productLoader.cargarAsignacionMultiple(caso.producto.codigoInterno);
      if (precio > 0) { preciosAntes.push({ metodo: "asignMultiple", precio }); console.log(`   ✅ Precio: ${precio}`); }
      else console.log("   ⚠️ Asignación múltiple no cargó el producto — se OMITE de la comparación");
    } catch (e) { console.log(`   ❌ Error en asignación múltiple: ${e.message}`); }
    await page.waitForTimeout(500);
  }

  if (mets.plantilla && caso.plantillaNombre) {
    try {
      console.log("📄 Probando plantilla...");
      const precio = await productLoader.cargarDesdePlantilla(caso.plantillaNombre);
      if (precio > 0) { preciosAntes.push({ metodo: "plantilla", precio }); console.log(`   ✅ Precio: ${precio}`); }
      else console.log("   ⚠️ Plantilla no cargó el producto — se OMITE de la comparación");
    } catch (e) { console.log(`   ❌ Error en plantilla: ${e.message}`); }
    await page.waitForTimeout(500);
  }

  const precioAntes = fmtPrecios(preciosAntes.map((p) => p.precio));

  // Regla de descuento (si vino en configuraciones): cambia cliente/zona/vendedor.
  const reglaKey = Object.keys(caso.configuraciones || {}).find((k) =>
    /^reglas?_(de_)?descuentos?$/.test(String(k).replace(/\s+/g, "_")));
  if (reglaKey) {
    const raw = String(caso.configuraciones[reglaKey] || "").trim();
    const mm = raw.match(/^\(\s*(cliente|zona|vendedor)\s*\)\s*(.+)$/i);
    const tipo = mm ? mm[1].toLowerCase() : "cliente";
    const dato = mm ? mm[2].trim() : raw;
    if (!dato || /^(cliente|zona|vendedor)$/i.test(dato)) {
      console.log(`\n🏷️ Regla de descuento: falta el dato. Usá "regla_descuentos: (cliente) 0002". Se omite.`);
    } else {
      console.log(`\n🏷️ Regla de descuento (${tipo}): cambiando a "${dato}"...`);
      try {
        page.once("dialog", (d) => d.accept().catch(() => {}));
        if (tipo === "vendedor") await documentsPage.seleccionarVendedor(dato);
        else await documentsPage.seleccionarCliente(dato);
        await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(2500);
        console.log(`   ✅ Cambiado (${tipo}: ${dato}); Fidel recalcula con la regla.`);
      } catch (e) { console.log(`   ❌ No pude cambiar ${tipo} a "${dato}": ${e.message}`); }
    }
  }

  if (caso.configuraciones && Object.keys(caso.configuraciones).length > 0) {
    console.log("\n⚙️ Aplicando configuraciones...");
    const configApplier = new ConfigApplier(page, caso.documento);
    configsAplicadas = await configApplier.aplicar(caso.configuraciones, caso.producto.codigoInterno);
    console.log("✅ Configuraciones aplicadas");
    await page.waitForTimeout(2000);
  } else {
    console.log("⚠️ No hay configuraciones para aplicar");
  }

  console.log("\n💰 Leyendo precios DESPUÉS de configuraciones:");
  await page.waitForTimeout(3000);

  const lineasDetalle = await page.evaluate(leerLineasProducto, caso.documento);
  const preciosDespues = lineasDetalle.map((l) => l.total).filter((p) => p > 0);
  console.log(`   Precios DESPUÉS: ${preciosDespues.join(", ")} (${preciosDespues.length})`);

  console.log("\n📊 DETALLE POR LÍNEA (Precio / Cantidad / Bonif. / Total):");
  lineasDetalle.forEach((l, i) =>
    console.log(`   Línea ${i + 1}: precio=${l.precio}  cant=${l.cantidad}  bonif=${l.bonificacion}  total=${l.total}  [${l.fuente}]`));

  const camposComparar = [["precio", "Precio (unitario)"], ["cantidad", "Cantidad"], ["bonificacion", "Bonificación"], ["total", "Total"]];
  let camposConsistentes = lineasDetalle.length > 0;
  for (const [campo, etiqueta] of camposComparar) {
    const distintos = [...new Set(lineasDetalle.map((l) => l[campo]))];
    if (distintos.length === 1) console.log(`   ✅ ${etiqueta}: coincide en todas las líneas (${distintos[0]})`);
    else { camposConsistentes = false; console.log(`   ❌ ${etiqueta}: NO coincide -> ${distintos.join(", ")}`); }
  }

  // Verificación de la regla de descuento (si aplica).
  const tieneReglaDescuento = Object.keys(caso.configuraciones || {}).some((k) =>
    /^reglas?_(de_)?descuentos?$/.test(String(k).replace(/\s+/g, "_")));
  if (tieneReglaDescuento && lineasDetalle.length) {
    const bonifs = [...new Set(lineasDetalle.map((l) => l.bonificacion))];
    const r2 = (n) => Math.round(n * 100) / 100;
    const baseSet = [...new Set(preciosAntes.map((p) => p.precio))];
    const descSet = [...new Set(lineasDetalle.map((l) => (l.cantidad > 0 ? r2(l.total / l.cantidad) : l.total)))];
    console.log("\n🏷️ REGLA DE DESCUENTO (verificación):");
    let bonifOk = false;
    if (bonifs.length === 1) { bonifOk = bonifs[0] > 0; console.log(`   ${bonifOk ? "✅" : "⚠️"} Bonificación uniforme: ${bonifs[0]}%`); }
    else console.log(`   ❌ Bonificación dispar entre cargas: ${bonifs.join(", ")}%`);
    let bajoOk = false;
    if (baseSet.length === 1 && descSet.length === 1) {
      const base = baseSet[0], desc = descSet[0];
      if (desc < base) { bajoOk = true; const pct = base > 0 ? Math.round((1 - desc / base) * 1000) / 10 : 0; console.log(`   ✅ Precio por unidad BAJÓ: $${base} → $${desc} (~${pct}% menos).`); }
      else if (desc === base) console.log(`   ❌ El precio por unidad NO cambió ($${base}).`);
      else console.log(`   ❌ El precio por unidad SUBIÓ ($${base} → $${desc}).`);
    } else console.log(`   ⚠️ No pude comparar por unidad.`);
    reglaDescuentoOk = bonifOk && bajoOk;
  }

  console.log("\n📊 ANTES de configuraciones:");
  const preciosUnicosAntes = [...new Set(preciosAntes.map((p) => p.precio))];
  if (preciosUnicosAntes.length === 1) console.log(`✅ Todos los métodos dan el mismo precio: ${preciosUnicosAntes[0]}`);
  else { console.log("❌ Los precios NO coinciden:"); preciosAntes.forEach((p) => console.log(`   ${p.metodo}: ${p.precio}`)); }

  console.log("\n📊 DESPUÉS de configuraciones:");
  const preciosUnicosDespues = [...new Set(preciosDespues)];
  exito = preciosDespues.length > 0 && preciosUnicosDespues.length === 1 && camposConsistentes && reglaDescuentoOk;
  if (preciosUnicosDespues.length === 1) console.log(`✅ Todos los productos tienen el mismo precio: ${preciosUnicosDespues[0]}`);
  else { console.log("❌ Los precios NO coinciden:"); preciosDespues.forEach((p, i) => console.log(`   Producto ${i + 1}: ${p}`)); }

  console.log("\n💾 Guardando el documento...");
  guardado = await documentsPage.guardar({ confirmar: confirmarGuardado });
  const icono = guardado.estado === "ok" ? "✅ OK" : guardado.estado === "error" ? "❌ Error (Fidel)" : "⚠️ no concluyente";
  console.log(`   Resultado del guardado: ${icono}${guardado.mensaje ? " -> " + guardado.mensaje : ""}`);
  await page.waitForTimeout(2000);

  return { exito, guardado, precioAntes, precioDespues: fmtPrecios(preciosDespues), tiposCarga: preciosAntes.map((p) => nombreMetodo[p.metodo] || p.metodo), configsAplicadas };
}

module.exports = { correrCaso };
