# MUJJIC PLAYER -- all-in-one cross-device launcher.
#
# One command that:
#   1. Finds this PC's LAN IP.
#   2. Opens the Windows Firewall for the backend + web ports (so phones/tablets reach it).
#   3. Starts the Python backend on 0.0.0.0 (reachable from any device on the Wi-Fi).
#   4. Starts the Expo WEB server bound to the LAN (open it in any device's browser).
#   5. Prints every link you need: web app, backend API, health check, download endpoint.
#
# Run:  ./start-all.ps1
# Options:
#   -Ip 192.168.1.50   force a specific LAN IP (skip auto-detect)
#   -BackendPort 8000  backend port (default 8000)
#   -WebPort 8090      web app port (default 8090)
param(
  [string]$Ip = "",
  [int]$BackendPort = 8000,
  [int]$WebPort = 8090
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
$webUrl     = "http://$($Ip):$($WebPort)"

# --- open the firewall for both ports so OTHER devices can connect ---
function Ensure-FirewallRule([string]$name, [int]$port) {
  try {
    if (-not (Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue)) {
      New-NetFirewallRule -DisplayName $name -Direction Inbound -Action Allow `
        -Protocol TCP -LocalPort $port -Profile Private,Public -ErrorAction Stop | Out-Null
      Write-Host "  Firewall opened for port $port." -ForegroundColor DarkGray
    }
  } catch {
    Write-Host "  (Could not add firewall rule for port $port -- run allow-firewall.ps1 as admin if phones can't connect.)" -ForegroundColor DarkYellow
  }
}
Ensure-FirewallRule "MUJJIC backend $BackendPort" $BackendPort
Ensure-FirewallRule "MUJJIC web $WebPort" $WebPort

# --- sanity checks: create venv + install deps if missing ---
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

# --- print every link ---
Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  MUJJIC PLAYER  --  cross-device links (same Wi-Fi as this PC)" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  Web app (open on ANY device's browser): " -NoNewline; Write-Host $webUrl -ForegroundColor Green
Write-Host "  Backend API base:                       " -NoNewline; Write-Host $backendUrl -ForegroundColor Green
Write-Host "  Health check:                           " -NoNewline; Write-Host "$backendUrl/health" -ForegroundColor Green
Write-Host "  Search example:                         " -NoNewline; Write-Host "$backendUrl/search?q=lofi&type=songs" -ForegroundColor DarkGray
Write-Host "  Download a track (m4a):                 " -NoNewline; Write-Host "$backendUrl/download/{videoId}" -ForegroundColor DarkGray
Write-Host "  Stream a track:                         " -NoNewline; Write-Host "$backendUrl/stream/{videoId}" -ForegroundColor DarkGray
Write-Host "------------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "  Native APK (background audio, lock screen): run ./build-apk.ps1" -ForegroundColor DarkGray
Write-Host "  Point the installed app's Settings -> Backend URL at: $backendUrl" -ForegroundColor DarkGray
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

# --- free the backend port if a stale/zombie instance is holding it ---
# Zombie backends from a previous run cause the new one to fail with
# "address already in use". Kill anything on the port and WAIT for it to release.
function Free-Port([int]$port) {
  for ($try = 0; $try -lt 10; $try++) {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if (-not $conns) { return $true }
    $conns.OwningProcess | Sort-Object -Unique | Where-Object { $_ -and $_ -ne 0 } | ForEach-Object {
      try { Stop-Process -Id $_ -Force -ErrorAction Stop } catch {}
    }
    Start-Sleep -Seconds 1
  }
  return -not (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue)
}
if (Get-NetTCPConnection -LocalPort $BackendPort -ErrorAction SilentlyContinue) {
  Write-Host "Port $BackendPort is in use (stale backend) -- clearing it..." -ForegroundColor Yellow
  if (-not (Free-Port $BackendPort)) {
    Write-Host "Could not free port $BackendPort. Close old backend windows / reboot, then re-run." -ForegroundColor Red
  }
}

# --- start backend directly (0.0.0.0 -> reachable across devices) ---
# Launch uvicorn.exe itself (NOT a nested powershell window, which was dying silently)
# and redirect its output to log files so any error is captured and readable.
$logDir = Join-Path $root "data"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$outLog = Join-Path $logDir "backend.log"
$errLog = Join-Path $logDir "backend.err.log"
Remove-Item $outLog, $errLog -ErrorAction SilentlyContinue
$uvicorn = Join-Path $root ".venv\Scripts\uvicorn.exe"
$backendProc = Start-Process -FilePath $uvicorn `
  -ArgumentList "server.main:app","--host","0.0.0.0","--port","$BackendPort" `
  -WorkingDirectory $root -RedirectStandardOutput $outLog -RedirectStandardError $errLog `
  -WindowStyle Hidden -PassThru
Write-Host "Backend starting (PID $($backendProc.Id)) on 0.0.0.0:$BackendPort -- logs: data\backend.log" -ForegroundColor DarkGray

# --- wait for the backend to actually answer /health before continuing ---
# First boot is slow: it imports yt-dlp + ytmusicapi, which can take 30-60s.
Write-Host "  Waiting for backend to finish loading (first boot imports yt-dlp/ytmusicapi, can take ~60s)..." -NoNewline -ForegroundColor DarkGray
$ok = $false
for ($i = 0; $i -lt 90; $i++) {
  Start-Sleep -Seconds 1
  try {
    $r = Invoke-RestMethod -Uri "http://127.0.0.1:$BackendPort/health" -TimeoutSec 3
    if ($r.status -eq "ok") { $ok = $true; break }
  } catch { }
  if ($i % 3 -eq 0) { Write-Host "." -NoNewline -ForegroundColor DarkGray }
}
Write-Host ""
if ($ok) {
  Write-Host "  BACKEND: ONLINE  ($backendUrl/health responded ok in $($i+1)s)" -ForegroundColor Green
} else {
  Write-Host "  BACKEND: still not responding after 90s. Real error from the backend logs:" -ForegroundColor Red
  $printed = $false
  foreach ($lf in @($errLog, $outLog)) {
    if ((Test-Path $lf) -and (Get-Content $lf -ErrorAction SilentlyContinue)) {
      Write-Host "  ---------------- $($lf | Split-Path -Leaf) (last lines) ----------------" -ForegroundColor DarkGray
      Get-Content $lf -Tail 15 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkYellow }
      $printed = $true
    }
  }
  if (-not $printed) { Write-Host "  (Logs are empty -- uvicorn may not have launched. Check .venv is intact.)" -ForegroundColor DarkGray }
  Write-Host "  Common causes: 'address already in use' (a stale backend is running)," -ForegroundColor DarkGray
  Write-Host "  ffmpeg not on PATH, no internet, or antivirus blocking python." -ForegroundColor DarkGray
}

# --- start Expo WEB bound to the LAN so other devices can open $webUrl ---
# Inject the LAN backend URL so the web app talks to the backend from any device.
$env:EXPO_PUBLIC_API_URL = $backendUrl
Write-Host "Starting web server on the LAN. Open $webUrl on your phone/tablet browser." -ForegroundColor Yellow
Write-Host "(Also scan the QR below with Expo Go to run the native shell.)" -ForegroundColor DarkGray
Write-Host ""

Set-Location (Join-Path $root "app")
npx expo start --web --host lan --port $WebPort
