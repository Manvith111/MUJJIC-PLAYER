@echo off
REM Double-click launcher for MUJJIC PLAYER.
REM All-in-one: opens firewall, starts backend on the LAN, starts the web app,
REM and prints every cross-device link (web app, backend API, health, download).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-all.ps1" %*
pause
