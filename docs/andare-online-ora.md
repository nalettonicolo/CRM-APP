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

Sul Mint (`192.168.1.53`), con `backend/.env` già configurato (modello: `backend/.env.example`):

```bash
cd ~/CRM-APP
git pull origin main
chmod +x backend/scripts/*.sh
./backend/scripts/deploy-completo-mint.sh
```

Esempio `.env` **senza dominio** (tunnel trycloudflare):

```env
NODE_ENV=production
PORT=4100
API_URL=https://xxx.trycloudflare.com
FRONTEND_URL=https://nicoloservice.netlify.app
TRUST_CROSS_SITE_COOKIES=true
ALLOW_NETLIFY_PREVIEWS=true
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
```

Se PM2 è vuoto: `./backend/scripts/ripristina-mint-pm2.sh` poi `./backend/scripts/aggiorna-url-tunnel.sh`.

### Esporre l’API su Internet (senza comprare dominio)

**Cloudflare Tunnel veloce** in PM2 — URL `https://....trycloudflare.com` (può cambiare se ricrei il tunnel).  
Guide: [`ripristino-pm2-tunnel-1033.md`](./ripristino-pm2-tunnel-1033.md), [`COSA-FARE.md`](./COSA-FARE.md).

Con dominio in futuro: [`guida-tunnel-permanente-pm2.md`](./guida-tunnel-permanente-pm2.md).

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
