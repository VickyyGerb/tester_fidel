// Page-object de Login (SSO de Fidel). Login AJAX: tras "Ingresar" no hay
// navegación clásica, así que esperamos por URL/elemento, no por waitForNavigation.
// El paso "ID de cuenta" es OPCIONAL: muchos usuarios entran directo con
// email+contraseña. Si el campo aparece, lo completamos; si no, seguimos.
async function login(page, { urlBase, email, password, cuentaId, log = console.log }) {
  if (!urlBase) throw new Error("Falta la URL de login (urlBase).");
  if (!email || !password) throw new Error("Faltan email y/o contraseña.");
  const cuenta = String(cuentaId ?? "").trim();

  log(`Login en ${urlBase} como ${email}...`);
  await page.goto(urlBase, { waitUntil: "domcontentloaded" });

  // Paso 1: credenciales.
  const emailBox = page.getByRole("textbox", { name: "Email" });
  await emailBox.waitFor({ state: "visible", timeout: 20000 });
  await emailBox.fill(email);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();

  // El SSO valida y redirige al sistema: esperamos salir del dominio del SSO.
  await page.waitForURL((url) => !/sso\./i.test(url), { timeout: 30000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});

  // Paso 2 (OPCIONAL): selección de cuenta. Solo si el campo aparece.
  const idCuenta = page.getByRole("textbox", { name: "ID de cuenta" });
  if (await idCuenta.isVisible().catch(() => false)) {
    if (!/^\d+$/.test(cuenta)) {
      throw new Error(`Este usuario pide "ID de cuenta" pero el valor "${cuentaId}" no es numérico.`);
    }
    log(`Paso 'ID de cuenta' presente, completando con ${cuenta}...`);
    await idCuenta.fill(cuenta);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await page.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});
  } else {
    log("Login directo (sin paso de ID de cuenta).");
  }

  log("✓ Login OK");
}

module.exports = { login };
