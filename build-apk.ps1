# Builds an installable Android APK in Expo's cloud (EAS) — full features incl.
# background audio, no Android Studio needed.
#
# One-time: this will ask you to log in to a FREE Expo account (opens a prompt),
# and to create the EAS project the first time (answer yes).
#
# Run:  ./build-apk.ps1
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "app")

Write-Host "== Step 1/2: Expo login (free account) ==" -ForegroundColor Cyan
Write-Host "If it says you're already logged in, that's fine." -ForegroundColor DarkGray
npx eas-cli@latest login

Write-Host ""
Write-Host "== Step 2/2: Cloud build (Android APK, ~10-20 min) ==" -ForegroundColor Cyan
Write-Host "When it finishes you'll get a link/QR to install the APK on your phone." -ForegroundColor DarkGray
npx eas-cli@latest build --platform android --profile preview

Write-Host ""
Write-Host "Done. Install the APK from the link above on your phone." -ForegroundColor Green
Write-Host "Then start the backend on this PC with:  ./run-backend.ps1" -ForegroundColor Green
Write-Host "The app defaults to http://192.168.1.2:8000 (change in Settings if your PC IP differs)." -ForegroundColor Green
