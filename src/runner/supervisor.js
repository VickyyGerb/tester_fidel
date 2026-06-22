// Supervisor del launcher: arranca el server y lo RELANZA si sale con código 99
// (lo que pide /api/actualizar para tomar el código nuevo tras un git pull).
// Cualquier otro código de salida termina de verdad.
const { spawn } = require("child_process");
const path = require("path");

const SERVER = path.join(__dirname, "server.js");

function arrancar() {
  const child = spawn(process.execPath, [SERVER], { stdio: "inherit" });
  child.on("close", (code) => {
    if (code === 99) {
      console.log("[supervisor] Reiniciando el launcher para tomar los cambios...");
      setTimeout(arrancar, 600); // respiro para liberar el puerto
    } else {
      process.exit(code == null ? 0 : code);
    }
  });
}

arrancar();
