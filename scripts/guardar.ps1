# GUARDAR — commit + push de los cambios. SOLO DEV (necesita permiso de push al repo).
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\guardar.ps1 -Mensaje "qué cambié"
# -SinConfirmar: salta el Read-Host (lo usa el launcher, que ya confirma en el HTML).
param(
  [string]$Mensaje = "",
  [switch]$SinConfirmar
)
. "$PSScriptRoot\_comun.ps1"

Assert-Comando "git" "Instalá Git desde https://git-scm.com"
Assert-Comando "gh"  "Instalá GitHub CLI o conectá desde el launcher."

if (-not (Test-Path (Join-Path $RepoRoot ".git"))) {
  throw "Esto no es un repo git."
}

# Sin cuenta conectada NO se puede guardar.
if (-not (GitHub-Conectado)) {
  throw "No estás conectado a GitHub. Usá 'Conectar GitHub' en el launcher (o corré: gh auth login)."
}
Ensure-Identidad

# ¿Hay algo para guardar?
$cambios = git -C $RepoRoot status --porcelain
if (-not $cambios) {
  Aviso "No hay cambios para guardar."
  return
}

if (-not $Mensaje) {
  $Mensaje = "cambios " + (Get-Date -Format "yyyy-MM-dd HH:mm")
}

Info "Cambios a guardar:"
git -C $RepoRoot status --short

if (-not $SinConfirmar) {
  Write-Host ""
  Aviso "Vas a GUARDAR y subir estos cambios a GitHub."
  $resp = Read-Host 'Escribí GUARDAR (en mayúsculas) para continuar'
  if ($resp -cne "GUARDAR") {
    Aviso "Cancelado (no escribiste GUARDAR)."
    return
  }
}

Info "Commit + push..."
git -C $RepoRoot add -A
git -C $RepoRoot commit -m $Mensaje
git -C $RepoRoot push

Ok "Guardado y subido a GitHub."


