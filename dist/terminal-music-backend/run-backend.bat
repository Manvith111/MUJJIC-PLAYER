@echo off
REM Double-click launcher: runs the PowerShell setup/start script for the backend.
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0run-backend.ps1"
pause
