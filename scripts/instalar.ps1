# INSTALAR — descarga/prepara todo para correr los tests.
# Uso (tester):  powershell -ExecutionPolicy Bypass -File scripts\instalar.ps1
. "$PSScriptRoot\_comun.ps1"

Assert-Comando "node" "Instalá Node.js LTS desde https://nodejs.org"
Assert-Comando "git"  "Instalá Git desde https://git-scm.com"

$nodeMajor = [int]((node -v) -replace '^v(\d+).*', '$1')
if ($nodeMajor -lt 18) {
  Write-Host ""
  Write-Host "Node.js $(node -v) es muy viejo. Playwright necesita 18+ (recomendado: LTS 22)." -ForegroundColor Red
  Write-Host "Instala la LTS desde https://nodejs.org, cerra esta ventana y volve a abrir instalar." -ForegroundColor Red
  exit 1
}

# Si NO estamos dentro de un repo git, clonamos.
$esRepo = Test-Path (Join-Path $RepoRoot ".git")
if (-not $esRepo) {
  $url = Get-RepoUrl
  if (-not $url) { throw "No sé de dónde clonar: completá `$RepoUrl en scripts\_comun.ps1" }
  Info "Clonando $url ..."
  git clone $url
  Ok "Repo clonado. Volvé a correr instalar.ps1 desde dentro de la carpeta."
  return
}

Info "Trayendo la última versión (git pull)..."
git -C $RepoRoot pull --ff-only

Info "Instalando dependencias (npm install)..."
Push-Location $RepoRoot
try {
  npm install
  Info "Instalando el navegador de Playwright (Chromium)..."
  npx playwright install chromium
} finally {
  Pop-Location
}

# .env a partir del ejemplo si no existe.
$env_  = Join-Path $RepoRoot ".env"
$envEx = Join-Path $RepoRoot ".env.example"
if (-not (Test-Path $env_) -and (Test-Path $envEx)) {
  Copy-Item $envEx $env_
  Aviso "Creé .env a partir de .env.example (revisá el puerto si hace falta)."
}

Ok "Listo. Para usarlo: scripts\abrir.ps1"

