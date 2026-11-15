# Documentazione CRM — indice

Controllo del 15/11/2026: ho confrontato le guide con il codice del repository (script in `backend/scripts/` e `scripts/`, `frontend/netlify.toml`, `backend/src/config/index.ts`, `.github/workflows/ci.yml`). **Non ho potuto provare i comandi** sul server o su Netlify: "valida" significa che file, script, porte e variabili citati esistono e sono coerenti col codice, non che io abbia rifatto la procedura.

Il 15/11/2026 Nicolò ha confermato che **sul Mint il tunnel Cloudflare è ancora attivo**. Per questo le guide Cloudflare sono segnate come valide, non come superate.

Legenda stato: ✅ valida · ⚠️ valida con correzioni · 🔧 solo per un caso particolare

## Come viene esposta l'API (due strade nel repository)

- **Tunnel Cloudflare** (in uso, confermato da Nicolò): processo PM2 `crm-tunnel`. Può essere un tunnel veloce (`trycloudflare`, l'URL cambia) o uno nominato/da token (URL fisso, serve un dominio su Cloudflare).
- **Tailscale Funnel** (URL `.ts.net` fisso): lo script `deploy-completo-mint.sh` lo usa solo se nel `backend/.env` c'è `USE_TAILSCALE_FUNNEL=true`; altrimenti usa il tunnel Cloudflare di `~/.cloudflared/config.yml` oppure ne avvia uno veloce.

> `riferimenti-produzione.md` (maggio 2026) dice che `crm-tunnel` è disattivato e che si usa Funnel: **non coincide** con quanto confermato oggi. Va riletto e corretto da chi ha accesso al Mint.

## Guide principali

| Guida | Stato | Quando usarla |
|-------|-------|----------------|
| [`COSA-FARE.md`](./COSA-FARE.md) | ✅ | Checklist operativa: push Git, deploy Mint, Netlify, primo avvio. Gli esempi `.env` con URL `trycloudflare` valgono per il tunnel veloce |
| [`guida-vpn-privata-tailscale.md`](./guida-vpn-privata-tailscale.md) | non controllata | **SSH e admin Mint da fuori casa** (VPN privata) |
| [`guida-tailscale-funnel.md`](./guida-tailscale-funnel.md) | ✅ | API pubblica HTTPS con URL `.ts.net` fisso. Porta 4100 e script `setup-tailscale-funnel.sh` coerenti col repo |
| [`netlify-guida-completa.md`](./netlify-guida-completa.md) | ⚠️ | Frontend su Netlify. Configurazione, `netlify.toml`, `verify:netlify` e CI sono corretti. Da correggere: il reverse proxy punta a `localhost:4000` (la porta dell'API è **4100**) e `ALLOW_NETLIFY_PREVIEWS` non ha effetto (il CORS accetta già ogni `*.netlify.app`, vedi `backend/src/app.ts`) |
| [`guida-email-smtp-completa.md`](./guida-email-smtp-completa.md) | non controllata | Gmail SMTP, email, backup Drive |
| [`riferimenti-produzione.md`](./riferimenti-produzione.md) | ⚠️ | URL pubblici (senza segreti). Dati di maggio 2026, probabilmente in parte vecchi: vedi avviso sopra |
| [`porte-crm.md`](./porte-crm.md) | ✅ | Porte fisse: API CRM 4100 |

## Guide su tunnel e Netlify

| Guida | Stato | Nota |
|-------|-------|------|
| [`guida-tunnel-da-sito-cloudflare.md`](./guida-tunnel-da-sito-cloudflare.md) | ✅ | Tunnel da pannello Cloudflare con token (script `avvia-tunnel-token-pm2.sh`, variabile `CLOUDFLARE_TUNNEL_TOKEN`). Serve un dominio su Cloudflare. Script e porta 4100 coerenti col repo |
| [`guida-tunnel-permanente-pm2.md`](./guida-tunnel-permanente-pm2.md) | ✅ | Tunnel nominato da terminale (`setup-tunnel-pm2.sh`, `config.yml`). Alternativa alla guida da pannello; serve un dominio su Cloudflare |
| [`ripristino-pm2-tunnel-1033.md`](./ripristino-pm2-tunnel-1033.md) | 🔧 | Solo per il tunnel **veloce** (`trycloudflare`) o dopo un riavvio con PM2 vuoto. L'URL citato (`forests-battle-…`) è vecchio e non tornerà attivo. Gli script `ripristina-mint-pm2.sh` e `fix-tunnel-1033.sh` esistono |
| [`cloudflared-config.example.yml`](./cloudflared-config.example.yml) | ✅ | Esempio di configurazione per il tunnel nominato |
| [`guida-api-stabile-senza-dominio.md`](./guida-api-stabile-senza-dominio.md) | ⚠️ | Confronto tra tunnel veloce, nominato e Tailscale. La parte **C** (sync Netlify con `NETLIFY_AUTH_TOKEN` e `sync-netlify-api-url.sh`) serve proprio con il tunnel veloce, che cambia URL. Il punto A (tunnel nominato "senza dominio") è poco chiaro: senza dominio su Cloudflare non si ottiene un URL fisso |
| [`guida-deploy-autonomo-mint-dominio.md`](./guida-deploy-autonomo-mint-dominio.md) | non controllata | Mint + dominio proprio, senza Netlify. Lo script `configura-dominio-mint.sh` esiste |

**Archivio guide Cloudflare:** Nicolò ha chiesto di spostarle in `docs/archivio/`. Non l'ho fatto in questo giro: la modifica che ho a disposizione crea e cambia file ma non sposta né cancella, e una copia lascerebbe due versioni da tenere allineate. Inoltre il tunnel è ancora in uso e queste guide sono richiamate da `README.md`, `COSA-FARE.md` e dalle guide stesse, quindi lo spostamento va fatto con `git mv` aggiornando tutti i link (vedi issue proposta).

File locale (gitignored): `RIFERIMENTI-PRODUZIONE.local.md` nella root del repo — token e note private.
