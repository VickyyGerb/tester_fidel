@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === Fidel Tester - Instalar ===
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Transcript -Path '%~dp0instalar-log.txt' -Force | Out-Null; & '%~dp0scripts\instalar.ps1'; Stop-Transcript | Out-Null"
echo.
echo === Termino. Revisa los mensajes de arriba. ===
pause
