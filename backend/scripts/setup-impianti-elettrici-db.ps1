# Crea database Impianti Elettrici + applica schema Prisma
# Uso: cd backend\scripts  →  .\setup-impianti-elettrici-db.ps1

param(
  [string]$PostgresUser = "postgres",
  [string]$DbHost = "localhost",
  [int]$Port = 5432
)

$ScriptDir = $PSScriptRoot
$BackendDir = Split-Path $ScriptDir -Parent
$RootDir = Split-Path $BackendDir -Parent

$plainPwd = Read-Host "Password PostgreSQL per utente '$PostgresUser'"
$env:PGPASSWORD = $plainPwd

function Invoke-PsqlFile($file, $database = "postgres") {
  Write-Host "`n>> $file (database: $database)" -ForegroundColor Cyan
  & psql -h $DbHost -p $Port -U $PostgresUser -d $database -f (Join-Path $ScriptDir $file)
  if ($LASTEXITCODE -ne 0) {
    throw "Errore in $file (codice $LASTEXITCODE)"
  }
}

try {
  if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    throw "psql non trovato. Aggiungi PostgreSQL\bin al PATH."
  }

  Invoke-PsqlFile "init-database-03-impianti-elettrici.sql"
  Invoke-PsqlFile "init-database-03b-grant-impianti-elettrici.sql"
  Invoke-PsqlFile "init-database-grants-impianti-elettrici.sql" "crm_impianti_elettrici"

  $envFile = Join-Path $BackendDir ".env"
  if (-not (Test-Path $envFile)) {
    Write-Host "`nAttenzione: backend/.env non trovato. Crea DATABASE_URL_IE manualmente." -ForegroundColor Yellow
  } else {
    $crmUrl = (Get-Content $envFile | Where-Object { $_ -match '^DATABASE_URL=' }) -replace '^DATABASE_URL=', ''
    if ($crmUrl -match '/([^/?]+)\?') {
      $ieUrl = $crmUrl -replace "/$($Matches[1])\?", "/crm_impianti_elettrici?"
      Write-Host "`nAggiungi in backend/.env:" -ForegroundColor Green
      Write-Host "DATABASE_URL_IE=$ieUrl" -ForegroundColor Yellow
    }
  }

  Write-Host "`nApplico schema Prisma su crm_impianti_elettrici..." -ForegroundColor Cyan
  Push-Location $RootDir
  if ($env:DATABASE_URL_IE) {
    $env:DATABASE_URL = $env:DATABASE_URL_IE
  } else {
    throw "Imposta DATABASE_URL_IE in backend/.env prima di db:push:ie"
  }
  npm run db:push:ie --workspace=backend
  npm run db:seed:ie --workspace=backend
  Pop-Location

  Write-Host "`nDatabase Impianti Elettrici pronto." -ForegroundColor Green
} catch {
  Write-Host "`nERRORE: $_" -ForegroundColor Red
  exit 1
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
