# Deploy autonomo su Mint + dominio personalizzato (senza Netlify)

Obiettivo: **tutto sul tuo Mint** (PostgreSQL, API, sito Next.js) con un **dominio tuo** stabile (es. `https://www.nicoloservice.it`), senza dipendere da Netlify né da URL `trycloudflare.com` che cambiano.

---

## Architettura consigliata

```text
Internet
   │
   ▼
Cloudflare (DNS + TLS gratis)
   │
   ▼
Tunnel permanente (cloudflared, PM2: crm-tunnel)
   │
   ├── www.tuodominio.it  →  Next.js :3000  (PM2: crm-web)
   │                         proxy /api → Express :4100
   └── PostgreSQL locale
```

| Componente | Dove | PM2 |
|------------|------|-----|
| Database | Mint | (servizio PostgreSQL) |
| API Express | Mint `:4100` | `crm-api` |
| Sito Next.js | Mint `:3000` | `crm-web` |
| Tunnel HTTPS | Mint | `crm-tunnel` |

**Un solo dominio pubblico** (`www.tuodominio.it`): il browser chiama `/api/...` sullo stesso host; Next inoltra in locale a Express. Niente CORS complicato, niente cookie cross-site.

---

## Cosa ti serve

1. **Mint** acceso con CRM già funzionante (`crm-api`, database).
2. **Dominio** (Aruba, Register, Cloudflare Registrar, …).
3. **Account Cloudflare** (piano Free): dominio con **nameserver Cloudflare**.
4. **Tunnel Cloudflare nominato** (non il tunnel veloce `trycloudflare`).

Guide correlate:

- Tunnel dal pannello: [`guida-tunnel-da-sito-cloudflare.md`](./guida-tunnel-da-sito-cloudflare.md)
- Tunnel da terminale: [`guida-tunnel-permanente-pm2.md`](./guida-tunnel-permanente-pm2.md)
- Esempio `config.yml`: [`cloudflared-config.example.yml`](./cloudflared-config.example.yml)

---

## Passo 1 — Dominio su Cloudflare

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Aggiungi sito** → inserisci `tuodominio.it`.
2. Cambia i **nameserver** presso il registrar con quelli indicati da Cloudflare.
3. Attendi stato **Attivo**.

Opzionale: record **Redirect** da `tuodominio.it` → `https://www.tuodominio.it` (regola in Cloudflare **Regole** → Redirect).

---

## Passo 2 — Tunnel permanente (hostname fisso)

### Dal sito Cloudflare (più semplice)

Segui [`guida-tunnel-da-sito-cloudflare.md`](./guida-tunnel-da-sito-cloudflare.md):

1. Zero Trust → **Networks** → **Tunnels** → crea tunnel `crm-nicolo-service`.
2. **Public Hostname**:
   - `www.tuodominio.it` → `http://localhost:3000`
   - (opzionale) `tuodominio.it` → `http://localhost:3000`
3. Copia il **token** e sul Mint:

```bash
pm2 delete crm-tunnel 2>/dev/null || true
pm2 start cloudflared --name crm-tunnel -- tunnel run --token 'eyJ...'
pm2 save
```

### Da file `config.yml`

Copia [`cloudflared-config.example.yml`](./cloudflared-config.example.yml) in `~/.cloudflared/config.yml`, poi:

```bash
~/CRM-APP/backend/scripts/setup-tunnel-pm2.sh
```

---

## Passo 3 — Variabili (backend + frontend)

Sul Mint, con il **tuo** URL finale (es. `https://www.nicoloservice.it`):

```bash
cd ~/CRM-APP
chmod +x backend/scripts/configura-dominio-mint.sh
./backend/scripts/configura-dominio-mint.sh https://www.tuodominio.it 4100
```

Lo script imposta:

- `backend/.env` → `API_URL`, `FRONTEND_URL`, `NODE_ENV=production`
- `frontend/.env.production` → `NEXT_PUBLIC_API_URL`, `API_INTERNAL_URL`

Controlla anche in `backend/.env`: `DATABASE_URL`, `JWT_*`, SMTP Gmail.

---

## Passo 4 — Deploy completo

```bash
cd ~/CRM-APP
git pull origin main
./backend/scripts/deploy-completo-mint.sh
```

Lo script:

1. Aggiorna API (`crm-api`)
2. Builda e avvia il frontend (`crm-web`) se esiste `frontend/.env.production`
3. Gestisce il tunnel (`crm-tunnel`)

Verifica:

```bash
pm2 list
curl -sf http://127.0.0.1:4100/api/health
curl -sf http://127.0.0.1:3000/ | head
curl -sf https://www.tuodominio.it/api/health
```

Apri nel browser: **https://www.tuodominio.it**

---

## Passo 5 — Staccarsi da Netlify

1. **Non serve più** `NEXT_PUBLIC_API_URL` su Netlify.
2. Opzionale: su Netlify → sito → **Stop builds** o elimina il sito.
3. Se usavi `nicoloservice.netlify.app`, aggiorna link/bookmark al nuovo dominio.
4. In **Impostazioni CRM** (logo, testi) tutto resta sul DB Mint.

---

## PM2 a ogni boot (una tantum)

```bash
pm2 startup
# esegui la riga sudo che stampa PM2
pm2 save
```

Processi attesi: `crm-api`, `crm-web`, `crm-tunnel`.

---

## Alternativa: due sottodomini (`www` + `api`)

Se preferisci API su `api.tuodominio.it`:

1. Tunnel: `www` → `:3000`, `api` → `:4100` (vedi commenti in `cloudflared-config.example.yml`).
2. `frontend/.env.production`:

   ```env
   NEXT_PUBLIC_API_URL=https://api.tuodominio.it
   ```

   (senza `API_INTERNAL_URL` se il client parla direttamente all’API).

3. `backend/.env`:

   ```env
   FRONTEND_URL=https://www.tuodominio.it
   API_URL=https://api.tuodominio.it
   TRUST_CROSS_SITE_COOKIES=true
   ```

4. Rebuild frontend + restart API.

---

## Google: cosa resta utile

| Servizio | Ruolo |
|----------|--------|
| **Gmail SMTP** | Email preventivi / contatti ([`guida-email-smtp-completa.md`](./guida-email-smtp-completa.md)) |
| **Google Drive** | Backup automatici (rclone) |
| **Login Cloudflare** | Puoi usare account Google |

**Non** serve hostare il sito su Google: il CRM resta sul Mint; Cloudflare espone solo HTTPS verso casa tua.

---

## Risoluzione problemi

| Sintomo | Azione |
|---------|--------|
| Sito bianco / Application error | `pm2 logs crm-web --lines 50` |
| Login: impossibile contattare API | `API_URL` e `NEXT_PUBLIC_API_URL` devono essere il **dominio www**, non trycloudflare |
| 502 da Cloudflare | `crm-web` o `crm-tunnel` spenti → `pm2 restart crm-web crm-tunnel` |
| Logo/uploads non visibili | Stesso dominio + proxy `/uploads` → Express attivo |
| Tunnel URL cambia ancora | Stai usando tunnel **veloce**; passa a tunnel **nominato** + dominio |

---

## Riepilogo comandi

```bash
# Config iniziale dominio
./backend/scripts/configura-dominio-mint.sh https://www.tuodominio.it

# Deploy
git pull origin main
./backend/scripts/deploy-completo-mint.sh

# Solo frontend
./backend/scripts/deploy-frontend-mint.sh
```

Dopo questo setup **non aggiorni più Netlify** a ogni fix: `git pull` + `deploy-completo-mint.sh` sul Mint.
