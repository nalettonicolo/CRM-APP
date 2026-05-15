# Guida Netlify — NexusCRM (monorepo)

Questa guida collega **GitHub → Netlify → frontend Next.js**. Il backend API e PostgreSQL restano sul tuo **VPS/server Linux** (non su Netlify).

Repository di riferimento: [github.com/nalettonicolo/CRM-APP](https://github.com/nalettonicolo/CRM-APP).

---

## Parte A — Prima volta su Netlify

### 1. Account e accesso GitHub

1. Vai su [netlify.com](https://www.netlify.com) e crea/accedi all’account.
2. **Team / Sites** → **Add new site** → **Import an existing project**.
3. **GitHub** → autorizza Netlify alla lettura dei repo (solo repo selezionati o tutti).
4. Scegli il repository **`CRM-APP`**.

### 2. Impostazioni di build (monorepo — importante)

Nel progetto il **`package-lock.json` è nella root** (workspace npm). Netlify deve installare dalla root e compilare **`crm-frontend`** in `frontend/`.

Segui la procedura monorepo di Netlify ([Monorepos](https://docs.netlify.com/build/configure-builds/monorepos/)):

**Site configuration → Build & deploy → Continuous deployment → Build settings:**

| Impostazione | Valore |
|----------------|--------|
| **Base directory** | *(vuoto)* — root del repository |
| **Package directory** | **`frontend`** *(solo dall’UI Netlify)* |
| **Build command** | vuoto *(usa `netlify.toml`)* oppure `npm ci && npm run build --workspace=crm-frontend` |
| **Publish directory** | **vuoto** nell’UI oppure non impostato manualmente — nel repo è definito **`frontend/.next`** in [`frontend/netlify.toml`](../frontend/netlify.toml) (path relativo alla root del repo). Se nell’UI hai `.next` senza prefisso, Netlify cerca `/repo/.next` e il plugin fallisce. |
| **Branch** | `main` (o il branch di produzione) |

Il file letto da Netlify (con **Package directory = `frontend`**) è **`frontend/netlify.toml`**: comando `npm ci` dalla root del repo, poi **solo** `npm run build --workspace=crm-frontend`, e **`publish = "frontend/.next"`** così il plugin Next trova l’output (non alla root `/repo/.next`).

> Non usare **Base directory = `frontend`** da sola senza lockfile in quella cartella. **Root vuota + Package directory `frontend`** è la combinazione corretta.

Node: **`NODE_VERSION=20`** in `frontend/netlify.toml`.

### 3. Variabili d’ambiente (dove cliccare in Netlify)

L’**API pubblica** del gestionale è il server Node/Express sul VPS (es. `https://api.tuodominio.it`), **non** Netlify e **non** PostgreSQL. `NEXT_PUBLIC_API_URL` deve puntare a quell’indirizzo: è l’URL che il browser userà per chiamare login, clienti, preventivi, ecc.

**Percorso nel pannello** (interfaccia classica):

1. Accedi a [app.netlify.com](https://app.netlify.com) e apri il sito (es. **nicoloservice**).
2. **Site configuration** (ingranaggio / *Project configuration*).
3. Nel menu a sinistra: **Environment variables** (a volte sotto *Build & deploy* → *Environment*).
4. **Add a variable** (o *Add environment variables*).
5. Compila:
   - **Key:** `NEXT_PUBLIC_API_URL`
   - **Values:** es. `https://api.tuodominio.it` (**senza** `/` alla fine)
   - **Scopes:** attiva almeno **Production** (e opzionale *Deploy Previews*).
6. Salva e poi **Triggers deploy** → **Clear cache and deploy site** (così Next ricompila con il nuovo valore).

Se l’API non esiste ancora: puoi temporaneamente mettere un URL segnaposto solo per far passare il build; l’app in produzione **non potrà fare login/dati reali** finché non imposti l’URL vero dell’API e ridistribuisci.

Opzionale: seconda variabile **`NEXT_PUBLIC_APP_NAME`** = `NexusCRM`.

### 4. Primo deploy

1. **Deploy site**.
2. Apri **Deploy log**: deve comparire `npm ci`, poi build Next.js.
3. Apri l’URL tipo **`https://qualcosa.netlify.app`**.

Se il build fallisce, copia l’errore dalla tab **Deploy log** e confrontalo con la sezione **Troubleshooting** più sotto.

### 5. Dominio personalizzato (opzionale)

**Domain management → Add domain** → segui DNS (record A/CNAME come da Netlify). Il certificato TLS è gestito automaticamente.

Il valore **`FRONTEND_URL`** sul backend API deve essere **esattamente** l’URL finale del sito (es. `https://tuodominio.it` o `https://xxx.netlify.app`).

---

## Parte B — Collegare tutto (schema completo)

```
GitHub (push main)
    ↓
Netlify (build Next.js dalla root del monorepo)
    ↓
Browser utente → https://sito.netlify.app
    ↓ chiamate HTTP a
API Node (VPS) → https://api.tuo-dominio.it
    ↓
PostgreSQL (es. Mint 192.168.x.x) — solo raggiungibile dal VPS API
```

### Checklist “tutto collegato”

1. **GitHub:** push su `main` aggiorna Netlify (auto deploy se abilitato).
2. **Netlify:** variabile `NEXT_PUBLIC_API_URL` punta all’API reale e pubblicamente raggiungibile.
3. **VPS API:** processo Node/Docker in ascolto (es. porta 443 tramite reverse proxy Nginx/Caddy).
4. **VPS `.env` produzione** (vedi `backend/.env.production.example`):

   ```env
   NODE_ENV=production
   API_URL=https://api.tuo-dominio.it
   FRONTEND_URL=https://tuo-sito.netlify.app
   TRUST_CROSS_SITE_COOKIES=true
   DATABASE_URL=postgresql://...
   JWT_SECRET=...
   JWT_REFRESH_SECRET=...
   ```

5. **HTTPS su API:** necessario se usi `TRUST_CROSS_SITE_COOKIES=true` (cookie `SameSite=None`).
6. **Firewall Postgres:** consentire solo l’IP del VPS dell’API sulla porta PostgreSQL — **non** esporre Postgres su Internet verso Netlify.

### Verifica rapida dopo deploy

| Test | Come |
|------|------|
| Frontend caricato | Apri URL Netlify → homepage pubblica |
| API raggiungibile | Browser o terminale: `GET https://api.tuo-dominio.it/api/health` → JSON `status: ok` |
| Login app | Pagina `/login` → dopo login la dashboard risponde (nessun errore CORS in DevTools → Network) |

Se il login fallisce solo online ma in locale funziona: controlla **`FRONTEND_URL`**, **`TRUST_CROSS_SITE_COOKIES`**, HTTPS API e messaggi CORS nella console.

---

## Parte C — Backend API sul VPS (richiamo)

Non è parte di Netlify, ma è obbligatorio perché il sito funzioni:

1. Clona il repo sul VPS (o deploy artefatto Docker).
2. Copia `backend/.env.production.example` → `backend/.env` e compila tutti i valori.
3. `npm ci`, `npm run db:migrate:prod --workspace=backend` (o `db:push` solo se accetti sync senza migrazioni versionate).
4. Avvio: `npm run start --workspace=backend` o Docker.
5. Reverse proxy (Nginx/Caddy) con TLS verso `localhost:4000`.

---

## Parte D — Deploy preview e sicurezza

- **`ALLOW_NETLIFY_PREVIEWS=true`** sul backend consente CORS da qualsiasi `*.netlify.app`: comodo per PR, meno restrittivo. Valuta se attivarlo.
- **`FRONTEND_URLS`**: elenco separato da virgole di URL preview specifici se non vuoi aprire tutto `*.netlify.app`.

---

## Troubleshooting

| Sintomo | Azione |
|---------|--------|
| Build Netlify: “no package-lock” / dipendenze | Base directory **vuota**, Package directory **`frontend`**, comando in [`frontend/netlify.toml`](../frontend/netlify.toml); vedi [guida Netlify](netlify-guida-completa.md). |
| Plugin Next: publish directory non trovata (`/repo/.next`) | Nel sito Netlify, **Build → Publish directory**: lascia **vuoto** (o allineato a `frontend/.next`). Il valore nel TOML è `publish = "frontend/.next"`; un override UI a `.next` rompe il monorepo. |
| Build: Next.js errore env | Imposta `NEXT_PUBLIC_*` su Netlify **prima** del deploy (poi rid deploy). |
| Login / refresh fallisce solo in prod | HTTPS API + `TRUST_CROSS_SITE_COOKIES=true` + `FRONTEND_URL` esatto. |
| CORS blocked | Aggiorna `FRONTEND_URL` / `FRONTEND_URLS` sul backend; riavvia API. |
| Pagina bianca | Console browser → errori caricamento chunk / URL API sbagliato. |

---

## Documentazione correlata

- Variabili template API: `backend/.env.production.example`
- Variabili template Netlify (copia-incolla): `frontend/.env.production.example`
- Panoramica deploy: [`deploy-production.md`](deploy-production.md)
- CI GitHub: `.github/workflows/ci.yml`
