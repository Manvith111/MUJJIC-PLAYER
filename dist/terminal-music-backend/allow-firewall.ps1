# One-time: lets your phone reach the backend on TCP port 8000 through Windows
# Firewall. This adds a single inbound "Allow" rule for port 8000 on your private
# (and public) network profiles. It self-elevates (you'll see a UAC prompt).
#
# Run once:  ./allow-firewall.ps1
# To undo later:  Remove-NetFirewallRule -DisplayName "Terminal Music 8000"
$rule = "Terminal Music 8000"

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
  Write-Host "Requesting administrator rights (UAC prompt)..." -ForegroundColor Yellow
  Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-File","`"$PSCommandPath`""
  exit
}

if (Get-NetFirewallRule -DisplayName $rule -ErrorAction SilentlyContinue) {
  Write-Host "Firewall rule already exists - nothing to do." -ForegroundColor Green
} else {
  New-NetFirewallRule -DisplayName $rule -Direction Inbound -Action Allow `
    -Protocol TCP -LocalPort 8000 -Profile Private,Public | Out-Null
  Write-Host "Added firewall rule '$rule' for TCP 8000." -ForegroundColor Green
}
Read-Host "Done. Press Enter to close"
