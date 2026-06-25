@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Fidel Tester
echo === Fidel Tester - Abrir ===
echo.
echo Levantando el launcher... se va a abrir el navegador solo.
echo Para cerrarlo, cerra esta ventana.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\abrir.ps1"
echo.
echo === El launcher se cerro. ===
pause
