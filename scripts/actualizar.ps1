# ACTUALIZAR — trae lo último del repo y reinstala deps si cambiaron.
# Uso (tester):  powershell -ExecutionPolicy Bypass -File scripts\actualizar.ps1
. "$PSScriptRoot\_comun.ps1"

Assert-Comando "git" "Instalá Git desde https://git-scm.com"

if (-not (Test-Path (Join-Path $RepoRoot ".git"))) {
  throw "Esto no es un repo git. Corré scripts\instalar.ps1 primero."
}

Info "Trayendo la última versión (git pull)..."
git -C $RepoRoot pull --ff-only

Info "Reinstalando dependencias por las dudas (npm install)..."
Push-Location $RepoRoot
try {
  npm install
  npx playwright install chromium
} finally {
  Pop-Location
}

Ok "Actualizado."

