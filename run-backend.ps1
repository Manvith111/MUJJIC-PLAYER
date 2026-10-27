# Starts the Python backend. Called by start-all.ps1 in its own window, but you can
# also run it directly:  ./run-backend.ps1  (optionally -Port 8000)
#
# All backend output is ALSO written to  data\backend.log  so the launcher (and you)
# can read the real error even if this window closes.
param([int]$Port = 8000)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$uvicorn = Join-Path $PSScriptRoot ".venv\Scripts\uvicorn.exe"
if (-not (Test-Path $uvicorn)) {
  Write-Host "Backend venv not found at $uvicorn" -ForegroundColor Red
  Write-Host "Run ./start-all.ps1 once to set it up." -ForegroundColor Yellow
  Read-Host "Press Enter to close"
  exit 1
}

# Make sure the log directory exists and start a fresh log for this run.
$logDir = Join-Path $PSScriptRoot "data"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$logFile = Join-Path $logDir "backend.log"
Remove-Item $logFile -ErrorAction SilentlyContinue

Write-Host "Terminal Music backend -> http://0.0.0.0:$Port" -ForegroundColor Cyan
Write-Host "Logging to: $logFile" -ForegroundColor DarkGray
Write-Host "Leave this window open while using the app." -ForegroundColor DarkGray
Write-Host ""

# Tee stdout+stderr to both this window and the log file so errors are never lost.
& $uvicorn server.main:app --host 0.0.0.0 --port $Port 2>&1 | Tee-Object -FilePath $logFile
