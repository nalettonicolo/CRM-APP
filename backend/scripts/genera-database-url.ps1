# Genera DATABASE_URL con nome database codificato (spazi, accenti)
# Uso: .\genera-database-url.ps1

$user = Read-Host "Utente PostgreSQL (es. postgres)"
$pass = Read-Host "Password"
$host = Read-Host "Host (es. localhost)"
$port = Read-Host "Porta (es. 5432)"
$dbName = Read-Host "Nome database esatto come in pgAdmin (es. Nicolò Service)"

$encodedDb = [uri]::EscapeDataString($dbName)
$url = "postgresql://${user}:${pass}@${host}:${port}/${encodedDb}?schema=public"

Write-Host "`nCopia in backend/.env:`n" -ForegroundColor Green
Write-Host "DATABASE_URL=$url"
