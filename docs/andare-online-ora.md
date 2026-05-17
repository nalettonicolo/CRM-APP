# Andare online adesso — Nicolò Service

Il sito **frontend** può stare su Netlify; l’**API** e PostgreSQL restano sul tuo server (Mint `192.168.1.53`).  
Senza API pubblica in **HTTPS**, il login da `nicoloservice.netlify.app` **non funziona**.

---

## Stato attuale

| Parte | URL | Stato |
|--------|-----|--------|
| Frontend | https://nicoloservice.netlify.app | Online (aggiorna con **Clear cache and deploy** se vedi testi vecchi) |
| API | Da esporre (es. `https://api.tuodominio.it`) | **Da fare** sul server Mint |
| Database | `192.168.1.53:5432` / `crm_gestionale` | Già usato in sviluppo |

---

## Passo 1 — Netlify (5 minuti)

1. [app.netlify.com](https://app.netlify.com) → sito **nicoloservice**
2. **Site configuration → Environment variables** → aggiungi o aggiorna:

   | Chiave | Valore |
   |--------|--------|
   | `NEXT_PUBLIC_API_URL` | URL **HTTPS** della tua API (es. `https://api.tuodominio.it`) — **senza** `/` finale |
   | `NEXT_PUBLIC_APP_NAME` | `Nicolò Service` |

   Finché l’API non c’è, puoi mettere temporaneamente un placeholder; il sito si apre ma il login fallirà.

3. **Deploys → Trigger deploy → Clear cache and deploy site** (così compaiono i testi audio/luci dall’ultimo push GitHub).

---

## Passo 2 — API sul server Mint (obbligatorio)

Sul PC/Linux dove gira PostgreSQL (`192.168.1.53`):

```bash
cd /percorso/CRM-APP
git pull origin main
npm ci
npm run db:generate --workspace=backend
npm run build --workspace=backend
```

Crea `backend/.env` di **produzione** (modello: `backend/.env.example`, sezione Produzione):

```env
NODE_ENV=production
PORT=4000
API_URL=https://api.TUO-DOMINIO.it
FRONTEND_URL=https://nicoloservice.netlify.app
TRUST_CROSS_SITE_COOKIES=true
ALLOW_NETLIFY_PREVIEWS=true

DATABASE_URL=postgresql://postgres:PASSWORD@127.0.0.1:5432/crm_gestionale?schema=public
JWT_SECRET=stringa-lunga-random-min-32-caratteri
JWT_REFRESH_SECRET=altra-stringa-lunga-random
```

Avvia l’API (esempio con PM2):

```bash
cd backend
npm run start
# oppure: pm2 start dist/index.js --name crm-api
```

L’API deve essere raggiungibile da Internet in **HTTPS** (non basta `192.168.1.53` se sei fuori casa).

### Esporre l’API su Internet

Scegli **una** strada:

**A) Dominio + Nginx + Let’s Encrypt** (consigliato in produzione)  
Reverse proxy da `https://api.tuodominio.it` → `http://127.0.0.1:4000`, certificato TLS, firewall che apre 443.

**B) Cloudflare Tunnel** (veloce per iniziare)  
Sul Mint: installa `cloudflared`, tunnel verso `localhost:4000`, ottieni un hostname `https://xxx.trycloudflare.com` o sottodominio tuo → usa quell’URL come `NEXT_PUBLIC_API_URL` e `API_URL`.

**C) Router**  
Port forwarding `443` → server Mint + DNS (No-IP, DuckDNS) se hai IP pubblico.

---

## Passo 3 — Collegare tutto

1. `NEXT_PUBLIC_API_URL` su Netlify = **stesso** URL di `API_URL` sul backend.
2. **Clear cache and deploy** su Netlify.
3. Apri https://nicoloservice.netlify.app/login  
4. Login con `ADMIN_EMAIL` / `ADMIN_PASSWORD` (dopo `npm run db:seed --workspace=backend` sul server).

---

## Verifica rapida

```bash
curl https://api.TUO-DOMINIO.it/api/health
# → {"status":"ok",...}
```

Dal browser: F12 → Network → login → la richiesta deve andare a `https://api.../api/auth/login`, non a `localhost`.

---

## Locale (sviluppo)

- API: `http://localhost:4001` (se la 4000 è occupata da altro software)
- Frontend: `http://localhost:3000`
- Vedi `frontend/.env.local` e `backend/.env`
