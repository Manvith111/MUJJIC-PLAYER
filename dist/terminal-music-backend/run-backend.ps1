# Terminal Music — backend launcher (self-contained).
#
# First run sets everything up: creates a local Python virtual environment,
# installs the dependencies, then starts the server. Later runs just start it.
#
#   Right-click -> "Run with PowerShell"   (or:  ./run-backend.ps1 )
#   Optional:  ./run-backend.ps1 -Port 8000
#
# Requirements on this PC:
#   • Python 3.11+  (https://www.python.org/downloads/  — tick "Add to PATH")
#   • ffmpeg        (https://www.gyan.dev/ffmpeg/builds/ or:  winget install Gyan.FFmpeg)
param([int]$Port = 8000)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "== Terminal Music backend ==" -ForegroundColor Cyan

# --- 1. Find a Python interpreter -------------------------------------------
$py = $null
foreach ($cand in @("py -3", "python", "python3")) {
  $exe = $cand.Split(" ")[0]
  if (Get-Command $exe -ErrorAction SilentlyContinue) { $py = $cand; break }
}
if (-not $py) {
  Write-Host "Python not found. Install Python 3.11+ and tick 'Add to PATH', then re-run." -ForegroundColor Red
  Read-Host "Press Enter to close"; exit 1
}

# --- 2. Create the virtual environment on first run -------------------------
$venv = Join-Path $PSScriptRoot ".venv"
if (-not (Test-Path (Join-Path $venv "Scripts\python.exe"))) {
  Write-Host "Creating virtual environment (.venv) ..." -ForegroundColor DarkGray
  iex "$py -m venv `"$venv`""
}
$pyVenv  = Join-Path $venv "Scripts\python.exe"
$uvicorn = Join-Path $venv "Scripts\uvicorn.exe"

# --- 3. Install / update dependencies ---------------------------------------
Write-Host "Installing dependencies (first run can take a minute) ..." -ForegroundColor DarkGray
& $pyVenv -m pip install --upgrade pip --quiet
& $pyVenv -m pip install -r (Join-Path $PSScriptRoot "requirements.txt") --quiet

# --- 4. Check ffmpeg (needed to produce .m4a downloads) ---------------------
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  Write-Host "WARNING: ffmpeg not on PATH. Streaming works, but DOWNLOADS need ffmpeg." -ForegroundColor Yellow
  Write-Host "         Install with:  winget install Gyan.FFmpeg   (then reopen this window)" -ForegroundColor Yellow
}

# --- 5. Show the LAN address to type into the app's Settings ----------------
$ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
       Where-Object { $_.IPAddress -notlike "169.*" -and $_.IPAddress -ne "127.0.0.1" } |
       Select-Object -First 1).IPAddress
Write-Host ""
Write-Host "Backend starting on port $Port." -ForegroundColor Green
if ($ip) {
  Write-Host "In the MUJJIC PLAYER app -> Settings -> Backend URL, set:" -ForegroundColor Green
  Write-Host "    http://$ip`:$Port" -ForegroundColor White
}
Write-Host "Leave this window open while using the app. Ctrl+C to stop." -ForegroundColor DarkGray
Write-Host ""

# --- 6. Run uvicorn directly (robust even if the path contains spaces) ------
$logDir = Join-Path $PSScriptRoot "data"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$logFile = Join-Path $logDir "backend.log"
Remove-Item $logFile -ErrorAction SilentlyContinue

& $uvicorn server.main:app --host 0.0.0.0 --port $Port 2>&1 | Tee-Object -FilePath $logFile
