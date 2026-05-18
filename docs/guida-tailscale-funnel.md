# Tailscale Funnel — API stabile senza dominio (Netlify + Mint)

Espone l’API CRM (`crm-api` su porta **4100**) con un URL HTTPS **fisso** tipo:

`https://server-casa.tailxxxxx.ts.net`

- Nessun dominio acquistato
- Nessun `trycloudflare.com` che scade
- Frontend resta su **Netlify** (`https://nicoloservice.netlify.app`)

---

## Architettura

```text
Browser → nicoloservice.netlify.app (Netlify)
       → https://mint-hostname.ts.net/api/... (Tailscale Funnel → Mint:4100)
```

Nel `.env` del backend: `TRUST_CROSS_SITE_COOKIES=true` (siti diversi: Netlify ↔ Tailscale).

---

## Parte 1 — Account Tailscale (browser, una tantum)

1. Vai su [https://login.tailscale.com/start](https://login.tailscale.com/start) e crea account (piano **Personal** gratuito).
2. **Admin console** → [Access controls](https://login.tailscale.com/admin/acls) → sezione **Funnel** → **Add Funnel to policy** (se non c’è già).
3. **DNS** → verifica che **MagicDNS** sia attivo sul tailnet.

---

## Parte 2 — Installazione sul Mint

SSH sul Mint:

```bash
cd ~/CRM-APP && git pull origin main
chmod +x backend/scripts/setup-tailscale-funnel.sh
```

### 2.1 Installa Tailscale (se manca)

```bash
curl -fsSL https://tailscale.com/install.sh | sh
```

### 2.2 Collega il Mint al tailnet (una tantum)

```bash
sudo tailscale up
```

Apri il link che compare nel terminale e **autorizza** il device (nome es. `mint-crm`).

Verifica:

```bash
tailscale status
```

### 2.3 Abilita Funnel (prima volta)

```bash
tailscale funnel --yes 4100
```

Se chiede approvazione nel browser, conferma. Poi `Ctrl+C` — useremo lo script con `--bg`.

---

## Parte 3 — Script automatico (consigliato)

Assicurati che l’API sia su:

```bash
pm2 list          # crm-api online
curl -sf http://127.0.0.1:4100/api/health
```

Esegui (sostituisci l’URL Netlify se diverso):

```bash
./backend/scripts/setup-tailscale-funnel.sh
# oppure con URL frontend esplicito:
./backend/scripts/setup-tailscale-funnel.sh https://nicoloservice.netlify.app
```

Lo script:

1. Ferma `crm-tunnel` (Cloudflare quick) se attivo  
2. Avvia `tailscale funnel --bg` verso la porta API  
3. Aggiorna `API_URL` e `FRONTEND_URL` in `backend/.env`  
4. Imposta `USE_TAILSCALE_FUNNEL=true` e `TRUST_CROSS_SITE_COOKIES=true`  
5. Riavvia `crm-api`  
6. Se hai `NETLIFY_AUTH_TOKEN` in `.env`, allinea Netlify e avvia deploy  

Annota l’URL stampato (es. `https://mint-casa.tailxxxxx.ts.net`).

---

## Parte 4 — Netlify (se non usi sync automatico)

Su [app.netlify.com](https://app.netlify.com) → **nicoloservice** → Environment variables:

| Chiave | Valore |
|--------|--------|
| `NEXT_PUBLIC_API_URL` | Stesso URL Tailscale (es. `https://mint-casa.tailxxxxx.ts.net`) |

**Clear cache and deploy**.

Da Windows (PowerShell):

```powershell
cd "d:\CRM APP"
.\scripts\netlify-aggiorna-api-url.ps1 "https://TUO-HOSTNAME.ts.net"
```

---

## Parte 5 — Verifica

```bash
# Sul Mint
curl -sf https://TUO-HOSTNAME.ts.net/api/health

tailscale funnel status
```

Dal telefono/PC: login su https://nicoloservice.netlify.app/login — non deve comparire l’errore trycloudflare.

---

## Dopo reboot del Mint

Con `tailscale funnel --bg`, Funnel **riparte** con Tailscale.

Controlla comunque:

```bash
tailscale status
tailscale funnel status
curl -sf http://127.0.0.1:4100/api/health
pm2 list
```

Se Funnel non è attivo:

```bash
./backend/scripts/setup-tailscale-funnel.sh
```

---

## Deploy successivi

```bash
cd ~/CRM-APP
USE_TAILSCALE_FUNNEL=1 ./backend/scripts/deploy-completo-mint.sh
```

Oppure solo API:

```bash
./backend/scripts/upgrade-mint.sh
pm2 restart crm-api
```

**Non** riavviare `crm-tunnel` Cloudflare se sei passato a Tailscale.

---

## Risoluzione problemi

| Problema | Soluzione |
|----------|-----------|
| `funnel` non disponibile | Admin → ACL → Add Funnel; client Tailscale ≥ 1.38 |
| Login Netlify: API irraggiungibile | `NEXT_PUBLIC_API_URL` = URL `.ts.net` esatto; redeploy Netlify |
| 401 / cookie sessione | `TRUST_CROSS_SITE_COOKIES=true` + `FRONTEND_URL` = URL Netlify esatto |
| Conflitto con Cloudflare | `pm2 delete crm-tunnel` |
| URL cambiato | Raro con Funnel; `tailscale funnel status` e rilancia setup script |

---

## Token Netlify sul Mint (opzionale)

In `backend/.env`:

```env
NETLIFY_AUTH_TOKEN=nfp_xxxx
NETLIFY_SITE_ID=6262024d-df81-4d4c-867b-1410dba7a9dd
```

Così `setup-tailscale-funnel.sh` aggiorna Netlify da solo.

---

## Riferimenti

- [Tailscale Funnel docs](https://tailscale.com/docs/features/tailscale-funnel)
- [`guida-api-stabile-senza-dominio.md`](./guida-api-stabile-senza-dominio.md)
