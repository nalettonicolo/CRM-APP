# Apre SSH sul Mini PC e lancia il deploy API.
# Uso: .\scripts\deploy-mint-remoto.ps1
# Richiede: OpenSSH client (ssh) e accesso a nicolo@192.168.1.53

$HostMint = $env:MINT_SSH_HOST
if (-not $HostMint) { $HostMint = "nicolo@192.168.1.53" }

$Cmd = @"
cd ~/CRM-APP && git pull origin main && chmod +x backend/scripts/*.sh && ./backend/scripts/deploy-completo-mint.sh && curl -s http://127.0.0.1:4100/api/health
"@

Write-Host "Connessione a $HostMint ..."
Write-Host "Comando: git pull + deploy-completo-mint.sh + healthcheck"
Write-Host ""

ssh $HostMint $Cmd
