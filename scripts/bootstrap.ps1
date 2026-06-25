# BOOTSTRAP — deja la PC lista de cero: instala Node y Git si faltan, clona el repo
# y corre scripts\instalar.ps1. Pensado para una PC Windows 10 LIMPIA: solo usa lo
# que trae Windows (curl.exe, PowerShell 5.1). NO requiere permisos de admin.
$ErrorActionPreference = "Stop"

$RepoUrl  = "https://github.com/VickyyGerb/tester_fidel.git"
$Branch   = "main"
$ToolsDir = Join-Path $env:LOCALAPPDATA "fidel-tester-tools"

function Info($m)  { Write-Host "-> $m" -ForegroundColor Cyan }
function Ok($m)    { Write-Host "OK $m" -ForegroundColor Green }
function Aviso($m) { Write-Host "!  $m" -ForegroundColor Yellow }

function Have($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

# Re-lee el PATH desde el registro (Machine + User) hacia esta sesion. Necesario
# despues de instalar algo, porque el proceso actual no ve el PATH actualizado.
function Refresh-Path {
  $m = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $u = [Environment]::GetEnvironmentVariable('Path', 'User')
  $env:Path = (@($m, $u) | Where-Object { $_ }) -join ';'
}

# Agrega un dir al PATH del USUARIO (persistente, sin admin) y a la sesion actual.
function Add-UserPath($dir) {
  $u = [Environment]::GetEnvironmentVariable('Path', 'User')
  if (($u -split ';') -notcontains $dir) {
    $nuevo = if ($u) { "$u;$dir" } else { $dir }
    [Environment]::SetEnvironmentVariable('Path', $nuevo, 'User')
  }
  if (($env:Path -split ';') -notcontains $dir) { $env:Path = "$env:Path;$dir" }
}

# OJO: en PowerShell 5.1 'curl' es un ALIAS de Invoke-WebRequest. Siempre curl.exe.
function Curl-Json($url) {
  $raw = & curl.exe -fsSL $url
  if ($LASTEXITCODE -ne 0) { throw "No pude descargar $url" }
  return (($raw -join "`n") | ConvertFrom-Json)
}

# ---------------------------------------------------------------- Node ----------
function Install-NodePortable {
  $arch = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }
  Info "Buscando la ultima LTS de Node..."
  $idx = Curl-Json "https://nodejs.org/dist/index.json"
  $ver = ($idx | Where-Object { $_.lts } | Select-Object -First 1).version  # ej v22.11.0
  if (-not $ver) { throw "No pude resolver la version LTS de Node." }
  $name = "node-$ver-win-$arch"
  $url  = "https://nodejs.org/dist/$ver/$name.zip"
  New-Item -ItemType Directory -Force -Path $ToolsDir | Out-Null
  $zip = Join-Path $ToolsDir "$name.zip"
  Info "Descargando Node $ver portable..."
  & curl.exe -fSL -o $zip $url
  if ($LASTEXITCODE -ne 0) { throw "Fallo la descarga de Node." }
  Expand-Archive -Path $zip -DestinationPath $ToolsDir -Force
  Remove-Item $zip -Force
  Add-UserPath (Join-Path $ToolsDir $name)
}

function Ensure-Node {
  if (Have "node") {
    $major = [int]((node -v) -replace '^v(\d+).*', '$1')
    if ($major -ge 18) { Ok "Node $(node -v) ya esta."; return }
    Aviso "Node $(node -v) es viejo (Playwright necesita 18+). Instalo una version nueva."
  }
  Info "Instalando Node.js..."
  if (Have "winget") {
    try {
      winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements --silent
      Refresh-Path
    } catch { Aviso "winget no pudo con Node, voy por la version portable." }
  }
  if (-not (Have "node")) { Install-NodePortable }
  if (-not (Have "node")) { throw "No pude instalar Node." }
  Ok "Node $(node -v) listo."
}

# ---------------------------------------------------------------- Git -----------
function Install-GitPortable {
  Info "Buscando Git portable (git-for-windows)..."
  $rel = Curl-Json "https://api.github.com/repos/git-for-windows/git/releases/latest"
  $asset = $rel.assets | Where-Object { $_.name -match 'PortableGit-.*-64-bit\.7z\.exe$' } | Select-Object -First 1
  if (-not $asset) { throw "No encontre el PortableGit en la release." }
  New-Item -ItemType Directory -Force -Path $ToolsDir | Out-Null
  $exe = Join-Path $ToolsDir $asset.name
  Info "Descargando Git portable..."
  & curl.exe -fSL -o $exe $asset.browser_download_url
  if ($LASTEXITCODE -ne 0) { throw "Fallo la descarga de Git." }
  $gitDir = Join-Path $ToolsDir "PortableGit"
  Info "Extrayendo Git..."
  Start-Process -FilePath $exe -ArgumentList "-o`"$gitDir`"", "-y" -Wait
  Remove-Item $exe -Force
  Add-UserPath (Join-Path $gitDir "cmd")
}

function Ensure-Git {
  if (Have "git") { Ok "Git ya esta."; return }
  Info "Instalando Git..."
  if (Have "winget") {
    try {
      winget install -e --id Git.Git --accept-source-agreements --accept-package-agreements --silent
      Refresh-Path
    } catch { Aviso "winget no pudo con Git, voy por la version portable." }
  }
  if (-not (Have "git")) { Install-GitPortable }
  if (-not (Have "git")) { throw "No pude instalar Git." }
  Ok "Git listo."
}

# ---------------------------------------------------------------- Repo ----------
# Devuelve la carpeta del repo. Si ya estamos adentro (bootstrap vive en scripts\),
# la reutiliza; si arrancamos solo con el .bat, clona al lado.
function Ensure-Repo {
  $repoLocal = Split-Path -Parent $PSScriptRoot   # carpeta padre de \scripts
  if ($repoLocal -and (Test-Path (Join-Path $repoLocal "package.json"))) {
    Ok "Repo encontrado en $repoLocal."
    return $repoLocal
  }
  $dest = Join-Path (Get-Location).Path "tester_fidel"
  if (-not (Test-Path (Join-Path $dest ".git"))) {
    Info "Clonando el repo en $dest ..."
    git clone --branch $Branch $RepoUrl $dest
    if ($LASTEXITCODE -ne 0) { throw "Fallo el git clone." }
  } else {
    Ok "Repo ya clonado en $dest."
  }
  return $dest
}

# ---------------------------------------------------------------- Main ----------
Write-Host ""
Info "Preparando la PC desde cero (Node + Git + repo)..."
Ensure-Node
Ensure-Git
$repo = Ensure-Repo
Write-Host ""
Info "Corriendo el instalador del repo..."
& (Join-Path $repo "scripts\instalar.ps1")
