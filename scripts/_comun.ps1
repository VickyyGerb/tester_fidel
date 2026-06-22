# Helpers compartidos por los scripts. No se ejecuta solo.
$ErrorActionPreference = "Stop"

# Raíz del repo = carpeta padre de /scripts.
$Global:RepoRoot = Split-Path -Parent $PSScriptRoot

# URL del repo en GitHub. Si quedó vacía, los scripts la leen del remoto 'origin'.
$Global:RepoUrl = "https://github.com/VickyyGerb/tester_fidel.git"

function Get-RepoUrl {
  if ($Global:RepoUrl) { return $Global:RepoUrl }
  try { return (git -C $Global:RepoRoot remote get-url origin).Trim() } catch { return "" }
}

function Assert-Comando($nombre, $ayuda) {
  if (-not (Get-Command $nombre -ErrorAction SilentlyContinue)) {
    throw "Falta '$nombre'. $ayuda"
  }
}

function Info($msg)  { Write-Host "→ $msg" -ForegroundColor Cyan }
function Ok($msg)    { Write-Host "✓ $msg" -ForegroundColor Green }
function Aviso($msg) { Write-Host "! $msg" -ForegroundColor Yellow }

# ¿Hay una cuenta de GitHub conectada vía gh?
function GitHub-Conectado {
  if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { return $false }
  gh auth status *> $null
  return ($LASTEXITCODE -eq 0)
}

# Fija la identidad git LOCAL de este repo desde la cuenta de gh (si no está ya).
# Usa el email noreply de GitHub para no exponer el mail real ni usar el de trabajo.
function Ensure-Identidad {
  $emailLocal = (git -C $RepoRoot config --local user.email) 2>$null
  if ($emailLocal) { return }
  $login = (gh api user --jq ".login") 2>$null
  $id    = (gh api user --jq ".id") 2>$null
  if (-not $login) { throw "No pude leer tu usuario de GitHub. Conectá con 'Conectar GitHub'." }
  git -C $RepoRoot config --local user.name  $login | Out-Null
  git -C $RepoRoot config --local user.email "$id+$login@users.noreply.github.com" | Out-Null
  Info "Identidad de este repo: $login (no afecta a tus otros repos)."
}

