# Crea utente e database (evita errore transazione di pgAdmin)
# Uso: cd backend\scripts  →  .\run-init-postgres.ps1

param(
  [string]$PostgresUser = "postgres",
  [string]$DbHost = "localhost",
  [int]$Port = 5432
)

$ScriptDir = $PSScriptRoot
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
    throw "psql non trovato. Aggiungi PostgreSQL\bin al PATH oppure usa la GUI (vedi sotto)."
  }
  Invoke-PsqlFile "init-database-01-user.sql"
  Invoke-PsqlFile "init-database-02-database.sql"
  Invoke-PsqlFile "init-database-02b-grant-db.sql"
  Invoke-PsqlFile "init-database-grants.sql" "crm_gestionale"
  Write-Host "`nDatabase pronto. Prossimo passo:" -ForegroundColor Green
  Write-Host "  npm run db:push --workspace=backend" -ForegroundColor Yellow
} catch {
  Write-Host "`nERRORE: $_" -ForegroundColor Red
  exit 1
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
