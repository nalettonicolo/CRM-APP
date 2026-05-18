# API sempre raggiungibile — senza comprare un dominio

Obiettivo: **Netlify** per il sito + **Mint** per API/DB, **nessun dominio tuo**, **nessun URL che devi aggiornare a mano** quando il tunnel cambia.

---

## Perché oggi si rompe

| Tipo tunnel | URL | Stabile? |
|-------------|-----|----------|
| **Veloce** `trycloudflare.com` | Nuovo a ogni ricreazione | No |
| **Nominato** + hostname pubblico Cloudflare | Fisso | Sì*, ma Cloudflare chiede un **sito aggiunto** al account per pubblicare l’app |
| **Tailscale Funnel** | `https://nome.macchina.ts.net` | Sì (gratis) |
| **Sync automatico → Netlify** | `trycloudflare` ok | Sì per l’utente: Mint aggiorna Netlify da solo |

\* Senza alcun dominio nel account Cloudflare, il pannello “Published application” non ti dà un hostname pubblico. Le opzioni realistiche sono **Tailscale** o **automazione Netlify**.

---

## Soluzione consigliata (Netlify + Mint, zero dominio)

### A — Tunnel nominato in PM2 (non ricrearlo a caso)

Sul Mint, **una volta**:

1. Account gratuito [Cloudflare Zero Trust](https://one.dash.cloudflare.com)
2. **Networks → Tunnels → Create tunnel** → nome `crm-nicolo-service`
3. Copia il comando con **token** `eyJ...` e avvia in PM2:

```bash
pm2 delete crm-tunnel 2>/dev/null || true
pm2 start cloudflared --name crm-tunnel -- tunnel run --token 'INCOLLA_TOKEN_QUI'
pm2 save
```

4. Per l’esposizione pubblica **senza dominio proprio**, usa il tunnel **veloce solo come origine** oppure passa alla **B (Tailscale)**.  
   Se in futuro aggiungi un dominio qualsiasi su Cloudflare (anche gratuito terze parti), potrai fissare `api.xxx` in un colpo solo.

### B — Tailscale Funnel (URL HTTPS stabile, gratis) — **guida completa**

Vedi **[`guida-tailscale-funnel.md`](./guida-tailscale-funnel.md)**.

Sul Mint, dopo `git pull`:

```bash
./backend/scripts/setup-tailscale-funnel.sh https://nicoloservice.netlify.app
```

Lo script configura Funnel, `.env`, riavvia l’API e (opzionale) Netlify.

### C — Automazione: Mint aggiorna Netlify quando cambia l’URL (consigliato con trycloudflare)

Anche se l’URL tunnel **cambia**, non tocchi più Netlify a mano.

#### 1. Token Netlify (una tantum)

1. [app.netlify.com](https://app.netlify.com) → User settings → **Applications** → **New access token**
2. Sul Mint, in `backend/.env` (non committare):

```env
NETLIFY_AUTH_TOKEN=nfp_xxxxxxxx
NETLIFY_SITE_ID=6262024d-df81-4d4c-867b-1410dba7a9dd
```

(`NETLIFY_SITE_ID` del sito nicoloservice — in Netlify → Site configuration → General → Site ID.)

#### 2. Dopo ogni fix tunnel

```bash
cd ~/CRM-APP
./backend/scripts/fix-tunnel-1033.sh
./backend/scripts/sync-netlify-api-url.sh
```

Lo script legge `API_URL` dal `.env`, imposta `NEXT_PUBLIC_API_URL` su Netlify e avvia un deploy.

#### 3. Boot automatico (opzionale)

Dopo `pm2 startup`, aggiungi in cron o in `deploy-completo-mint.sh` la chiamata a `sync-netlify-api-url.sh` se il tunnel è quick.

---

## Cosa tenere su Netlify

| Variabile | Valore |
|-----------|--------|
| `NEXT_PUBLIC_API_URL` | Uguale a `API_URL` sul Mint (Tailscale, trycloudflare aggiornato, ecc.) |

Sito: `https://nicoloservice.netlify.app` — **non scade**.

---

## Confronto rapido

| | Tailscale Funnel | trycloudflare + sync Netlify |
|--|------------------|------------------------------|
| Dominio acquistato | No | No |
| URL API fisso | Sì | No (ma Netlify si allinea da solo) |
| Setup | Medio | Facile |
| Dipendenze | Account Tailscale | Token Netlify in `.env` |

---

## Comandi utili

```bash
# Mint: nuovo URL tunnel + .env
./backend/scripts/fix-tunnel-1033.sh

# Allinea Netlify (con token in .env)
./backend/scripts/sync-netlify-api-url.sh

# Deploy completo
./backend/scripts/deploy-completo-mint.sh
```

Da Windows (senza token sul Mint):

```powershell
.\scripts\netlify-aggiorna-api-url.ps1 "https://URL-DA-PM2-LOGS.trycloudflare.com"
```

---

## Cosa non risolve “sempre online”

- Mint **spento** o senza Internet → nessuna soluzione pubblica funziona.
- `trycloudflare` senza sync → Netlify resta con URL vecchio (errore login).
- Comprare un dominio **non è obbligatorio** se usi Tailscale o sync Netlify.

Quando vorrai un indirizzo “professionale” senza pensieri, potrai aggiungere un dominio solo per `api.` — fino ad allora Tailscale o sync automatica sono le strade giuste.
