# ABRIR — levanta el launcher HTML y abre el navegador. Es lo que usa el tester día a día.
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\abrir.ps1
. "$PSScriptRoot\_comun.ps1"

Assert-Comando "node" "Corré scripts\instalar.ps1 primero."

if (-not (Test-Path (Join-Path $RepoRoot "node_modules"))) {
  Aviso "No están las dependencias. Corriendo instalar.ps1..."
  & "$PSScriptRoot\instalar.ps1"
}

# Puerto desde .env (default 4599).
$puerto = 4599
$envFile = Join-Path $RepoRoot ".env"
if (Test-Path $envFile) {
  $linea = Select-String -Path $envFile -Pattern '^\s*PORT\s*=\s*(\d+)' | Select-Object -First 1
  if ($linea) { $puerto = [int]$linea.Matches[0].Groups[1].Value }
}

Info "Levantando launcher en http://localhost:$puerto ..."
Start-Process "http://localhost:$puerto"
Push-Location $RepoRoot
try {
  # Supervisor: relanza el server cuando 'Actualizar' pide reiniciar.
  node src/runner/supervisor.js
} finally {
  Pop-Location
}

