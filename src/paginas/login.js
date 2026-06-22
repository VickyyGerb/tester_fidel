// Page-object de Login (SSO de Fidel). El login es AJAX: al apretar "Ingresar"
// NO hay navegación clásica (no dispara 'load'), por eso waitForNavigation se
// cuelga. La forma robusta es ESPERAR EL ELEMENTO siguiente, no la navegación.
// Login en 2 pasos: credenciales -> selección de cuenta por ID.
async function login(page, { urlBase, email, password, cuentaId, log = console.log }) {
  if (!urlBase) throw new Error("Falta la URL de login (urlBase).");
  if (!email || !password) throw new Error("Faltan email y/o contraseña.");
  const cuenta = String(cuentaId ?? "").trim();
  if (!/^\d+$/.test(cuenta)) {
    throw new Error(`ID de cuenta inválido: "${cuentaId}" (debe ser numérico).`);
  }

  log(`Login en ${urlBase} como ${email} (cuenta ${cuenta})...`);
  await page.goto(urlBase, { waitUntil: "domcontentloaded" });

  // Paso 1: credenciales.
  const emailBox = page.getByRole("textbox", { name: "Email" });
  await emailBox.waitFor({ state: "visible", timeout: 20000 });
  await emailBox.fill(email);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();

  // Paso 2: selección de cuenta. Esperamos que aparezca el campo (post-SSO),
  // sin depender de una navegación que quizá no ocurre.
  const idCuenta = page.getByRole("textbox", { name: "ID de cuenta" });
  try {
    await idCuenta.waitFor({ state: "visible", timeout: 25000 });
  } catch (e) {
    throw new Error(
      "Tras enviar las credenciales no apareció el paso 'ID de cuenta'. " +
        "Revisá email/contraseña o la URL de login (debe ser la del SSO)."
    );
  }
  await idCuenta.fill(cuenta);
  await page.getByRole("button", { name: "Ingresar" }).click();

  // Tras elegir la cuenta, esperamos a que el sistema cargue (tolerante).
  await page.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});
  log("✓ Login OK");
}

module.exports = { login };
