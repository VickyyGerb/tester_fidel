@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === Fidel Tester - Instalar ===
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\instalar.ps1"
echo.
echo === Termino. Revisa los mensajes de arriba. ===
pause
