# Riferimenti produzione — Nicolò Service CRM

> **URL pubblici** (ok in Git).  
> **Token e password** solo in `backend/.env` sul Mint o in `RIFERIMENTI-PRODUZIONE.local.md` (file locale, gitignored).

Ultimo aggiornamento: maggio 2026 — esposizione API via **Tailscale Funnel**.

---

## URL da tenere

| Ruolo | URL |
|--------|-----|
| **Sito (frontend)** | https://nicoloservice.netlify.app |
| **API (Mint + Funnel)** | https://servercasanaletto.tail4fb76e.ts.net |

L’URL API **non dovrebbe cambiare** finché non esegui `tailscale funnel reset` o reinstalli Funnel.

### Verifica rapida

```bash
curl -sf https://servercasanaletto.tail4fb76e.ts.net/api/health
```

---

## Variabili Mint (`~/CRM-APP/backend/.env`)

Dopo `setup-tailscale-funnel.sh` dovrebbero essere allineate così:

```env
API_URL=https://servercasanaletto.tail4fb76e.ts.net
FRONTEND_URL=https://nicoloservice.netlify.app
USE_TAILSCALE_FUNNEL=true
TAILSCALE_FUNNEL_URL=https://servercasanaletto.tail4fb76e.ts.net
TRUST_CROSS_SITE_COOKIES=true
NODE_ENV=production
PORT=4100
```

---

## Netlify

| Variabile | Valore |
|-----------|--------|
| `NEXT_PUBLIC_API_URL` | `https://servercasanaletto.tail4fb76e.ts.net` |

Aggiornamento da Windows:

```powershell
cd "d:\CRM APP"
.\scripts\netlify-aggiorna-api-url.ps1 "https://servercasanaletto.tail4fb76e.ts.net"
```

---

## Opzionale — sync automatico Mint → Netlify

In `backend/.env` sul Mint (mai nel repo):

```env
NETLIFY_AUTH_TOKEN=nfp_xxxxxxxx
NETLIFY_SITE_ID=6262024d-df81-4d4c-867b-1410dba7a9dd
```

Token: [Netlify → User settings → Applications](https://app.netlify.com/user/applications)

Poi, dopo un nuovo URL tunnel (non serve con Tailscale se non resetti Funnel):

```bash
./backend/scripts/sync-netlify-api-url.sh
```

---

## PM2 sul Mint

| Processo | Ruolo |
|----------|--------|
| `crm-api` | API Express |
| ~~`crm-tunnel`~~ | Non usare (Cloudflare quick) — disattivato con Tailscale |

Funnel: `sudo tailscale funnel status`

---

## Guide correlate

- [guida-vpn-privata-tailscale.md](./guida-vpn-privata-tailscale.md) — SSH / deploy da fuori casa
- [guida-tailscale-funnel.md](./guida-tailscale-funnel.md) — API pubblica
- [guida-api-stabile-senza-dominio.md](./guida-api-stabile-senza-dominio.md)
- [README.md](./README.md) — indice documentazione
