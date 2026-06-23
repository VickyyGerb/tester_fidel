// Fuente ÚNICA de verdad de los ambientes de Fidel.
// Cada ambiente tiene DOS URLs distintas:
//   - loginUrl: el SSO donde se ponen email/contraseña (lo que antes era "urlBase").
//   - base:     la raíz del sistema (el serviceURL del SSO). Las pantallas de
//               documentos cuelgan de acá (${base}/Sistema/Venta/Crear, etc.).
// Antes la base estaba hardcodeada en dev dentro de documents.js: por eso cambiar
// de ambiente rompía la navegación. Ahora todo deriva de este único lugar.
const AMBIENTES = [
  {
    id: "dev",
    etiqueta: "dev",
    loginUrl: "https://dev.sso.fidel.com.ar/login?serviceURL=https%3a%2f%2fdev.fidel.com.ar&validationPath=%2FHome%2FLogin",
    base: "https://dev.fidel.com.ar",
  },
  {
    id: "sandbox",
    etiqueta: "sandbox",
    loginUrl: "https://sandbox.sso.fidel.com.ar/login?serviceURL=https%3a%2f%2fsandbox.fidel.com.ar&validationPath=%2FHome%2FLogin",
    base: "https://sandbox.fidel.com.ar",
  },
  {
    id: "stage",
    etiqueta: "stage",
    loginUrl: "https://stage.sso.fidel.com.ar/login?serviceURL=https%3a%2f%2fstage.fidel.com.ar&validationPath=%2FHome%2FLogin",
    base: "https://stage.fidel.com.ar",
  },
  {
    id: "produccion",
    etiqueta: "produccion",
    loginUrl: "https://sso.fidel.com.ar/login?serviceURL=https%3a%2f%2ffidel.com.ar&validationPath=%2FHome%2FLogin",
    base: "https://fidel.com.ar",
  },
];

// Opciones listas para un campo tipo "select" del launcher (valor + etiqueta).
const OPCIONES_AMBIENTE = AMBIENTES.map((a) => ({ valor: a.id, etiqueta: a.etiqueta }));

// Resuelve un id ("dev", "stage", ...) al ambiente completo. Lanza si no existe.
function resolverAmbiente(id) {
  const amb = AMBIENTES.find((a) => a.id === String(id || "").trim());
  if (!amb) {
    const validos = AMBIENTES.map((a) => a.id).join(", ");
    throw new Error(`Ambiente desconocido: "${id}". Válidos: ${validos}.`);
  }
  return amb;
}

module.exports = { AMBIENTES, OPCIONES_AMBIENTE, resolverAmbiente };
