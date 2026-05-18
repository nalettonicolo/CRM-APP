# Aggiorna NEXT_PUBLIC_API_URL su Netlify e avvia deploy (dopo fix-tunnel sul Mint).
# Uso: .\scripts\netlify-aggiorna-api-url.ps1 "https://NUOVO.trycloudflare.com"
param(
  [Parameter(Mandatory = $true)]
  [string]$ApiUrl
)

$ApiUrl = $ApiUrl.Trim().TrimEnd("/")
if ($ApiUrl -notmatch "^https://") {
  Write-Error "L'URL deve iniziare con https://"
  exit 1
}

Push-Location "$PSScriptRoot\..\frontend"
try {
  netlify env:set NEXT_PUBLIC_API_URL $ApiUrl --context production
  netlify api createSiteBuild --data '{\"site_id\":\"6262024d-df81-4d4c-867b-1410dba7a9dd\",\"clear_cache\":true}'
  Write-Host "OK. NEXT_PUBLIC_API_URL=$ApiUrl"
  Write-Host "Attendi il deploy su https://app.netlify.com/projects/nicoloservice/deploys"
}
finally {
  Pop-Location
}
