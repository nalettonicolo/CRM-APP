# Watchdog locale: se API o frontend non rispondono, riavvio completo.
# Uso:
#   powershell -ExecutionPolicy Bypass -File scripts/watchdog-locale.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/watchdog-locale.ps1 -Once
#   powershell -ExecutionPolicy Bypass -File scripts/watchdog-locale.ps1 -IntervalSec 30

param(
  [int]$ApiPort = 4100,
  [int]$WebPort = 3000,
  [int]$IntervalSec = 45,
  [int]$FailBeforeRestart = 2,
  [switch]$Once
)

$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $Root "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logFile = Join-Path $logDir "watchdog-locale.log"
$avvia = Join-Path $PSScriptRoot "avvia-locale.ps1"

function Write-Log([string]$msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $msg
  Add-Content -Path $logFile -Value $line -Encoding UTF8
  Write-Host $line
}

function Test-Url([string]$Url) {
  try {
    $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
    return ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500)
  } catch {
    return $false
  }
}

function Test-Healthy {
  $api = Test-Url "http://127.0.0.1:$ApiPort/api/health"
  $web = Test-Url "http://127.0.0.1:$WebPort/login"
  return @{ Api = $api; Web = $web; Ok = ($api -and $web) }
}

function Invoke-FullRestart {
  Write-Log "RIAVVIO COMPLETO (API+$WebPort / FE+$ApiPort)…"
  & powershell -NoProfile -ExecutionPolicy Bypass -File $avvia -ApiPort $ApiPort -WebPort $WebPort
  $code = $LASTEXITCODE
  if ($code -eq 0) {
    Write-Log "Riavvio OK"
  } else {
    Write-Log "Riavvio con problemi (exit $code) — ritenterò al prossimo ciclo"
  }
}

Write-Log "Watchdog avviato (interval=${IntervalSec}s failBeforeRestart=$FailBeforeRestart once=$Once)"
$fails = 0

while ($true) {
  $h = Test-Healthy
  if ($h.Ok) {
    if ($fails -gt 0) { Write-Log "Servizi di nuovo OK (api=$($h.Api) web=$($h.Web))" }
    $fails = 0
  } else {
    $fails++
    Write-Log "HEALTH FAIL #$fails (api=$($h.Api) web=$($h.Web))"
    if ($fails -ge $FailBeforeRestart) {
      Invoke-FullRestart
      $fails = 0
      if ($Once) { break }
      Start-Sleep -Seconds ([Math]::Max(20, $IntervalSec))
      continue
    }
  }

  if ($Once) {
    if (-not $h.Ok) { Invoke-FullRestart }
    break
  }

  Start-Sleep -Seconds $IntervalSec
}

Write-Log "Watchdog terminato"
