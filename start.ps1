# Terminal Music — one-shot launcher.
#
# Starts the Python backend (in its own window) and the Expo dev server, and prints
# the exact link to open on your phone. Run from PowerShell:
#     ./start.ps1
# Optional: override the detected LAN IP with  ./start.ps1 -Ip 192.168.1.2
param(
  [string]$Ip = "",
  [int]$BackendPort = 8000
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
Set-Location $root

function Find-LanIp {
  $cands = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
      $_.IPAddress -ne '127.0.0.1' -and
      $_.IPAddress -notlike '169.254.*' -and
      $_.PrefixOrigin -in 'Dhcp','Manual'
    }
  # Prefer Wi-Fi, then private 192.168/10 ranges, then anything else.
  $ranked = $cands | Sort-Object -Property @{ Expression = {
      if ($_.InterfaceAlias -like 'Wi-Fi*' -or $_.InterfaceAlias -like '*Wireless*') { 0 }
      elseif ($_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*') { 1 }
      else { 2 }
  } }
  return ($ranked | Select-Object -First 1).IPAddress
}

if (-not $Ip) { $Ip = Find-LanIp }
if (-not $Ip) { $Ip = "127.0.0.1" }

$backendUrl = "http://$($Ip):$($BackendPort)"

# --- sanity checks ---
$venvUvicorn = Join-Path $root ".venv\Scripts\uvicorn.exe"
if (-not (Test-Path $venvUvicorn)) {
  Write-Host "Python venv not found. Creating it and installing backend deps..." -ForegroundColor Yellow
  python -m venv .venv
  & (Join-Path $root ".venv\Scripts\python.exe") -m pip install --upgrade pip -q
  & (Join-Path $root ".venv\Scripts\python.exe") -m pip install -r server/requirements.txt
}
if (-not (Test-Path (Join-Path $root "app\node_modules"))) {
  Write-Host "Installing app dependencies (npm install)..." -ForegroundColor Yellow
  Push-Location (Join-Path $root "app"); npm install; Pop-Location
}

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  TERMINAL MUSIC" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  Backend (put this in the app if asked): " -NoNewline; Write-Host $backendUrl -ForegroundColor Green
Write-Host "  Health check in a browser:              " -NoNewline; Write-Host "$backendUrl/health" -ForegroundColor Green
Write-Host "  Phone must be on the SAME Wi-Fi as this PC." -ForegroundColor DarkGray
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

# --- start backend in its own window (stays open, shows logs) ---
# Launch via -File (not -Command) so the space in the project path can't break quoting.
$runBackend = Join-Path $root "run-backend.ps1"
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", $runBackend, "-Port", "$BackendPort" | Out-Null
Write-Host "Backend starting in a new window on port $BackendPort ..." -ForegroundColor DarkGray
Start-Sleep -Seconds 2

# --- start Expo; inject the backend URL so the phone auto-connects ---
$env:EXPO_PUBLIC_API_URL = $backendUrl
Write-Host "Starting Expo dev server. Scan the QR below with Expo Go on your phone." -ForegroundColor Yellow
Write-Host "(For background audio + lock-screen controls, use: cd app; npx expo run:android)" -ForegroundColor DarkGray
Write-Host ""

Set-Location (Join-Path $root "app")
npx expo start
