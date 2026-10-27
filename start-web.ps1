# Preview MUJJIC PLAYER in a desktop browser (no APK / phone needed).
# Starts the backend (if not already running) and the Expo web server, then
# open the printed URL in your browser.
#
# Run:  ./start-web.ps1
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

# Backend on localhost for the web preview.
$backend = "http://127.0.0.1:8000"
$listening = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if (-not $listening) {
  Write-Host "Starting backend..." -ForegroundColor Cyan
  $runBackend = Join-Path $root "run-backend.ps1"
  Start-Process powershell -ArgumentList "-NoExit","-ExecutionPolicy","Bypass","-File",$runBackend,"-Port","8000" | Out-Null
  Start-Sleep -Seconds 2
} else {
  Write-Host "Backend already running." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Opening MUJJIC PLAYER in your browser at:" -ForegroundColor Green
Write-Host "  http://localhost:8090" -ForegroundColor Green
Write-Host "(Use your browser's device/responsive mode for a phone-sized view.)" -ForegroundColor DarkGray
Write-Host ""

$env:EXPO_PUBLIC_API_URL = $backend
Set-Location (Join-Path $root "app")
npx expo start --web --port 8090
