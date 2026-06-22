# CONECTAR GITHUB — login interactivo de gh en una consola real (la abre el launcher).
# Conecta TU cuenta de GitHub; sin esto no se puede Guardar.
. "$PSScriptRoot\_comun.ps1"

Assert-Comando "gh" "Instalá GitHub CLI desde https://cli.github.com"

Write-Host ""
Info "Vamos a conectar tu cuenta de GitHub."
Info "Se va a abrir el navegador: iniciá sesión con TU cuenta y autorizá."
Write-Host ""

gh auth login --hostname github.com --git-protocol https --web --skip-ssh-key
if ($LASTEXITCODE -ne 0) {
  Aviso "No se completó la conexión."
  Read-Host "Enter para cerrar"
  exit 1
}

# Configura git para que use el token de gh al hacer push (solo para github.com).
gh auth setup-git --hostname github.com

# Identidad git local de este repo (no toca tus otros repos).
Ensure-Identidad

$login = (gh api user --jq ".login") 2>$null
Ok "Conectado como $login. Ya podés Guardar desde el launcher."
Read-Host "Enter para cerrar"
