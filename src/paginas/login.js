// Page-object de Login. CLAVADO al de la referencia (utiles/login.js) que ya
// funciona, pero tomando las credenciales del formulario en vez de .env.
// Login en 2 pasos: credenciales -> selección de cuenta por ID.
// Clave: esperar waitForNavigation tras cada "Ingresar" para que la sesión
// quede bien establecida (si no, Venta/Crear rebota a la lista de facturas).
async function login(page, { urlBase, email, password, cuentaId, log = console.log }) {
  if (!urlBase) throw new Error("Falta la URL de login (urlBase).");
  if (!email || !password) throw new Error("Faltan email y/o contraseña.");
  const cuenta = String(cuentaId ?? "").trim();
  if (!/^\d+$/.test(cuenta)) {
    throw new Error(`ID de cuenta inválido: "${cuentaId}" (debe ser numérico).`);
  }

  for (let intento = 1; intento <= 2; intento++) {
    try {
      log(`Login en ${urlBase} como ${email} (cuenta ${cuenta})...`);
      await page.goto(urlBase);

      const emailBox = page.getByRole("textbox", { name: "Email" });
      await emailBox.waitFor({ state: "visible", timeout: 15000 });
      await emailBox.fill(email);
      await page.getByRole("textbox", { name: "Contraseña" }).fill(password);

      await page.getByRole("button", { name: "Ingresar" }).click();
      await page.waitForNavigation();
      await page.waitForLoadState("networkidle");

      await page.getByRole("textbox", { name: "ID de cuenta" }).fill(cuenta);
      await page.getByRole("button", { name: "Ingresar" }).click();
      await page.waitForNavigation({ timeout: 5000 }).catch(() => {});

      log("✓ Login OK");
      return;
    } catch (e) {
      if (intento === 2) throw e;
      log(`Login intento ${intento} falló, reintento... (${e.message})`);
    }
  }
}

module.exports = { login };
