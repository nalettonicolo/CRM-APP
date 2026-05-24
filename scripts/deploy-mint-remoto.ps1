# Apre SSH sul Mint e lancia il deploy API.
# Uso: .\scripts\deploy-mint-remoto.ps1
# Richiede: OpenSSH client (ssh)
# In casa: nicolo@192.168.1.53 — da fuori: IP Tailscale (100.x.x.x), vedi docs/guida-vpn-privata-tailscale.md

$HostMint = $env:MINT_SSH_HOST
if (-not $HostMint) { $HostMint = "nicolo@192.168.1.53" }

$Cmd = @"
cd ~/CRM-APP && git pull origin main && chmod +x backend/scripts/*.sh && ./backend/scripts/deploy-completo-mint.sh && curl -s http://127.0.0.1:4100/api/health
"@

Write-Host "Connessione a $HostMint ..."
Write-Host "Comando: git pull + deploy-completo-mint.sh + healthcheck"
Write-Host ""

ssh $HostMint $Cmd
