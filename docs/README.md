# Documentazione CRM — indice

Controllo del 15/11/2026: ho confrontato le guide con il codice del repository (script in `backend/scripts/` e `scripts/`, `frontend/netlify.toml`, `backend/src/config/index.ts`, `.github/workflows/ci.yml`). **Non ho potuto provare i comandi** sul server o su Netlify: "valida" significa che file, script, porte e variabili citati esistono e sono coerenti col codice, non che io abbia rifatto la procedura.

Legenda stato: ✅ valida · ⚠️ valida con correzioni · 🕓 superata o d'emergenza

## Guide principali (setup attuale: Netlify + Mint + Tailscale)

`riferimenti-produzione.md` (maggio 2026) indica come setup in uso API via **Tailscale Funnel**, con il processo `crm-tunnel` di Cloudflare disattivato.

| Guida | Stato | Quando usarla |
|-------|-------|----------------|
| [`COSA-FARE.md`](./COSA-FARE.md) | ⚠️ | Checklist operativa: push Git, deploy Mint, Netlify, primo avvio. Gli esempi `.env` usano ancora un URL `trycloudflare`: con Funnel usa l'URL `.ts.net` |
| [`guida-vpn-privata-tailscale.md`](./guida-vpn-privata-tailscale.md) | non controllata | **SSH e admin Mint da fuori casa** (VPN privata) |
| [`guida-tailscale-funnel.md`](./guida-tailscale-funnel.md) | ✅ | API pubblica HTTPS (URL `.ts.net` fisso). Porta 4100 e script `setup-tailscale-funnel.sh` coerenti col repo |
| [`netlify-guida-completa.md`](./netlify-guida-completa.md) | ⚠️ | Frontend su Netlify. Configurazione, `netlify.toml`, `verify:netlify` e CI sono corretti. Da correggere: il reverse proxy punta a `localhost:4000` (la porta dell'API è **4100**) e `ALLOW_NETLIFY_PREVIEWS` non ha effetto (il CORS accetta già ogni `*.netlify.app`, vedi `backend/src/app.ts`) |
| [`guida-email-smtp-completa.md`](./guida-email-smtp-completa.md) | non controllata | Gmail SMTP, email, backup Drive |
| [`riferimenti-produzione.md`](./riferimenti-produzione.md) | ✅ | URL pubblici (senza segreti). Aggiornata a maggio 2026 |
| [`porte-crm.md`](./porte-crm.md) | ✅ | Porte fisse: API CRM 4100 |

## Guide su tunnel e Netlify: quali valgono ancora

| Guida | Stato | Nota |
|-------|-------|------|
| [`guida-api-stabile-senza-dominio.md`](./guida-api-stabile-senza-dominio.md) | ⚠️ | Il confronto tra le opzioni e la parte **Tailscale** (B) valgono. La parte **C** (sync Netlify con `NETLIFY_AUTH_TOKEN` e `sync-netlify-api-url.sh`) funziona solo se usi un tunnel che cambia URL: con Funnel non serve. Il punto A (tunnel nominato "senza dominio") è poco chiaro: usa B |
| [`netlify-guida-completa.md`](./netlify-guida-completa.md) | ⚠️ | Vedi tabella sopra |
| [`guida-tunnel-permanente-pm2.md`](./guida-tunnel-permanente-pm2.md) | 🕓 | Tunnel Cloudflare nominato (legacy). Script `setup-tunnel-pm2.sh` e porta 4100 coerenti, ma serve un dominio su Cloudflare. Usala solo se lasci Tailscale |
| [`guida-tunnel-da-sito-cloudflare.md`](./guida-tunnel-da-sito-cloudflare.md) | 🕓 | Tunnel da pannello Cloudflare (script `avvia-tunnel-token-pm2.sh`, variabile `CLOUDFLARE_TUNNEL_TOKEN`). Serve un dominio su Cloudflare; non usata con Funnel |
| [`ripristino-pm2-tunnel-1033.md`](./ripristino-pm2-tunnel-1033.md) | 🕓 | Solo se usi ancora un tunnel Cloudflare **veloce** (`trycloudflare`). L'URL citato (`forests-battle-…`) è vecchio e non tornerà attivo. Gli script `ripristina-mint-pm2.sh` e `fix-tunnel-1033.sh` esistono |
| [`cloudflared-config.example.yml`](./cloudflared-config.example.yml) | 🕓 | Esempio di configurazione per il tunnel nominato |
| [`guida-deploy-autonomo-mint-dominio.md`](./guida-deploy-autonomo-mint-dominio.md) | non controllata | Mint + dominio proprio, senza Netlify. Lo script `configura-dominio-mint.sh` esiste |

Lo script `deploy-completo-mint.sh` usa Tailscale Funnel solo se nel `backend/.env` c'è `USE_TAILSCALE_FUNNEL=true`; altrimenti usa il tunnel Cloudflare configurato in `~/.cloudflared/config.yml` oppure ne avvia uno veloce. Con Funnel, tieni quella variabile impostata.

File locale (gitignored): `RIFERIMENTI-PRODUZIONE.local.md` nella root del repo — token e note private.
