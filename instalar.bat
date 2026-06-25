@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === Fidel Tester - Instalar ===
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Transcript -Path '%~dp0instalar-log.txt' -Force | Out-Null; try { $local = Join-Path '%~dp0' 'scripts\bootstrap.ps1'; if (Test-Path $local) { & $local } else { $b = Join-Path $env:TEMP 'fidel-bootstrap.ps1'; & curl.exe -fsSL -o $b 'https://raw.githubusercontent.com/VickyyGerb/tester_fidel/main/scripts/bootstrap.ps1'; & $b } } catch { Write-Host ('ERROR: ' + $_.Exception.Message) -ForegroundColor Red } finally { Stop-Transcript | Out-Null }"
echo.
echo === Termino. Revisa los mensajes de arriba. ===
pause
