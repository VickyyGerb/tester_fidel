// Page-object de Login. Adaptado del ejemplo (VickyyGerb/CargaDeProductos):
// login en 2 pasos -> credenciales + selección de cuenta por ID.
async function login(page, { urlBase, email, password, cuentaId, log = console.log }) {
  if (!urlBase) throw new Error("Falta la URL del sistema (urlBase).");
  if (!email || !password) throw new Error("Faltan email y/o contraseña.");
  if (!/^\d+$/.test(String(cuentaId ?? "").trim())) {
    throw new Error(`ID de cuenta inválido: "${cuentaId}" (debe ser numérico).`);
  }

  log(`Login en ${urlBase} como ${email}...`);
  await page.goto(urlBase, { waitUntil: "domcontentloaded" });

  // Paso 1: credenciales.
  await page.getByRole("textbox", { name: "Email" }).waitFor({ timeout: 15000 });
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForLoadState("networkidle");

  // Paso 2: selección de cuenta por ID.
  await page.getByRole("textbox", { name: "ID de cuenta" }).fill(String(cuentaId).trim());
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForLoadState("networkidle");

  log("✓ Login OK");
}

module.exports = { login };
