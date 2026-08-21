# Avvio pulito locale: libera porte e parte API + frontend.
# Uso: powershell -ExecutionPolicy Bypass -File scripts/avvia-locale.ps1

param(
  [int]$ApiPort = 4100,
  [int]$WebPort = 3000
)

$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $Root "package.json"))) {
  Write-Error "Esegui dalla root del repo CRM APP (trovato: $Root)"
  exit 1
}

function Stop-Port([int]$Port) {
  Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object {
      $pid = $_.OwningProcess
      if ($pid) {
        Write-Host "  stop pid $pid (porta $Port)"
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
      }
    }
}

Write-Host "==> Stop porte $ApiPort / $WebPort"
Stop-Port $ApiPort
Stop-Port $WebPort
Start-Sleep -Seconds 2

$logDir = Join-Path $Root "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$apiLog = Join-Path $logDir "backend-dev.log"
$webLog = Join-Path $logDir "frontend-dev.log"

Write-Host "==> Avvio API (porta $ApiPort)"
Start-Process -FilePath "npm" -ArgumentList @("run", "dev", "--workspace=backend") `
  -WorkingDirectory $Root `
  -WindowStyle Hidden `
  -RedirectStandardOutput $apiLog `
  -RedirectStandardError $apiLog `
  -PassThru | Out-Null

Write-Host "==> Avvio frontend (porta $WebPort)"
Start-Process -FilePath "npm" -ArgumentList @("run", "dev", "--workspace=crm-frontend") `
  -WorkingDirectory $Root `
  -WindowStyle Hidden `
  -RedirectStandardOutput $webLog `
  -RedirectStandardError $webLog `
  -PassThru | Out-Null

Write-Host "==> Attendo health…"
$okApi = $false
$okWeb = $false
for ($i = 0; $i -lt 40; $i++) {
  Start-Sleep -Seconds 2
  try {
    $h = Invoke-WebRequest -Uri "http://127.0.0.1:$ApiPort/api/health" -UseBasicParsing -TimeoutSec 3
    if ($h.StatusCode -eq 200) { $okApi = $true }
  } catch {}
  try {
    $f = Invoke-WebRequest -Uri "http://127.0.0.1:$WebPort/login" -UseBasicParsing -TimeoutSec 3
    if ($f.StatusCode -ge 200 -and $f.StatusCode -lt 500) { $okWeb = $true }
  } catch {}
  if ($okApi -and $okWeb) { break }
  Write-Host "  … attesa ($($i+1)) api=$okApi web=$okWeb"
}

if ($okApi -and $okWeb) {
  Write-Host "OK  API  http://localhost:$ApiPort"
  Write-Host "OK  WEB  http://localhost:$WebPort"
  Write-Host "     IE   http://localhost:$WebPort/impianti-elettrici"
  exit 0
}

Write-Host "ATTENZIONE: avvio incompleto (api=$okApi web=$okWeb). Vedi logs/."
exit 1
