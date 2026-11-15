# Nicolò Service — gestionale interno

Strumento multi-utente per **uso proprio**: clienti, preventivi, interventi, magazzino, calendario e (se serve) area cliente. Non è pensato come prodotto da rivendere: nessuna registrazione pubblica, account solo da te o da un admin.

## Stack

| Layer | Tecnologie |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4, Shadcn-style UI, Framer Motion, TanStack Query, Zustand |
| Backend | Node.js, Express 5, Prisma ORM, JWT + Refresh Token, Bcrypt |
| Database | PostgreSQL (server personale o Docker) |
| Deploy | Netlify (frontend), VPS/Docker/Railway/Render (API) |

## Struttura progetto

```
CRM-APP/                 # radice repository (nome cartella sul tuo PC)
├── frontend/          # Next.js — deploy Netlify
├── backend/           # API REST Express
├── docs/              # Guide deploy produzione + GitHub
├── .github/workflows/ # CI GitHub Actions
├── docker-compose.yml # PostgreSQL + API
├── backups/           # Backup PostgreSQL
└── scripts/setup.js   # Setup automatico
```

## Avvio rapido

### 1. PostgreSQL sul tuo server

#### A. Sul server PostgreSQL (SSH)

**pgAdmin (Windows/Linux):** esegui **un file alla volta**, nell’ordine:
1. `backend/scripts/init-database-01-user.sql` — database `postgres`
2. `backend/scripts/init-database-02-database.sql` — database `postgres` (**solo questo file**, non in transazione con altro)
3. `backend/scripts/init-database-grants.sql` — database `crm_gestionale`

> Errore *"CREATE DATABASE all'interno di un blocco di transazione"* → pgAdmin sta raggruppando tutto in una transazione. Esegui il file `02` da solo oppure usa psql.

**Da terminale (consigliato):**
```bash
psql -U postgres -f backend/scripts/init-database-01-user.sql
psql -U postgres -f backend/scripts/init-database-02-database.sql
psql -U postgres -d crm_gestionale -f backend/scripts/init-database-grants.sql
```

Oppure manualmente in `psql`:
```sql
CREATE USER crm_user WITH PASSWORD 'tua_password_sicura';
CREATE DATABASE crm_gestionale OWNER crm_user;
GRANT ALL PRIVILEGES ON DATABASE crm_gestionale TO crm_user;
```

#### B. Consenti connessioni remote

1. **postgresql.conf** — ascolta su tutte le interfacce (o IP specifico):
   ```
   listen_addresses = '*'
   ```

2. **pg_hba.conf** — aggiungi (sostituisci `IP_CLIENT` con IP del PC/VPS dove gira l'API):
   ```
   host    crm_gestionale    crm_user    IP_CLIENT/32    scram-sha-256
   ```
   Per sviluppo da rete locale: `192.168.1.0/24` invece di un singolo IP.

3. Riavvia PostgreSQL:
   ```bash
   sudo systemctl restart postgresql
   ```

4. **Firewall** — apri porta `5432` solo verso IP fidati (mai tutto Internet se evitabile).

#### C. Sul PC di sviluppo (questo progetto)

Modifica `backend/.env`:
```env
DATABASE_URL=postgresql://crm_user:tua_password@IP_DEL_TUO_SERVER:5432/crm_gestionale?schema=public
```

Test connessione:
```bash
npm run db:test
npm run db:push --workspace=backend
npm run db:seed --workspace=backend
```

**Docker locale (solo alternativa):**
```bash
docker compose up -d postgres
```

### 2. Configurazione

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Modifica `backend/.env`:
```env
DATABASE_URL=postgresql://crm_user:crm_password@localhost:5432/crm_gestionale?schema=public
JWT_SECRET=genera-chiave-sicura-min-32-caratteri
JWT_REFRESH_SECRET=genera-altra-chiave-sicura-min-32-caratteri
```

### 3. Installazione e database

```bash
npm install
npm run db:generate
npm run db:push --workspace=backend
npm run db:seed --workspace=backend
```

Il backend esegue `prisma generate` in **`postinstall`**. Se compare *@prisma/client did not initialize*, esegui: `npm run db:generate --workspace=backend`.

Su **Windows**, se `next build` fallisce su `.next` (`ENOTEMPTY`), il frontend pulisce la cache prima del build (`prebuild`); puoi anche eliminare manualmente `frontend/.next`.

Oppure setup automatico:
```bash
node scripts/setup.js
```

### 4. Avvio sviluppo

```bash
npm run dev
```

- **Frontend:** http://localhost:3000
- **API:** http://localhost:4100 (porta di default del backend: `PORT=4100` in `backend/.env.example` e in `backend/src/config/index.ts`)
- **Health check:** http://localhost:4100/api/health

> **Attenzione alla porta.** `frontend/.env.example` contiene ancora `NEXT_PUBLIC_API_URL=http://localhost:4000`, mentre il backend ascolta su **4100**. Dopo aver copiato il file in `frontend/.env.local`, imposta `NEXT_PUBLIC_API_URL=http://localhost:4100`. Anche `scripts/setup.js` stampa ancora la porta 4000 nel messaggio finale: è solo un testo.

### PostgreSQL: nome database con accenti / spazio

Il database **`Nicolò Service`** sul server è valido e raggiungibile (lo confermano anche `psql` e il driver `pg`). Con **Prisma**, invece, la stessa connessione può fallire con messaggi fuorvianti tipo *database non esiste*.

**Soluzione consigliata per Nicolò Service / questo progetto:** crea un database **solo ASCII**, ad esempio **`crm_gestionale`**, e usalo in `DATABASE_URL`.

Sul server Linux Mint:

```bash
sudo -u postgres psql -f /percorso/al/progetto/backend/scripts/create-crm-database-on-server.sql
```

oppure:

```bash
sudo -u postgres psql -c "CREATE DATABASE crm_gestionale OWNER postgres ENCODING 'UTF8';"
```

Poi su Windows:

```bash
npm run db:test
npm run db:push --workspace=backend
npm run db:seed --workspace=backend
```

Test connessione DB: `npm run db:test`

## Come entrare come amministratore

1. **Backend in esecuzione** (API raggiungibile da browser, stesso PC o rete/VPS).
2. Nel **`backend/.env`** puoi definire il primo admin prima del seed:
   - **`ADMIN_EMAIL`** — email con cui fai login (default: `admin@crm.local`)
   - **`ADMIN_PASSWORD`** — password (default: `Admin123!`)
3. **Seed eseguito** (`npm run db:seed --workspace=backend`): crea l’admin e **allinea sempre email, ruolo e password** dell’account definito da `ADMIN_EMAIL` alle variabili nel `.env` (così dopo aver modificato la password basta rilanciare il seed).
4. Apri il **frontend** (es. `http://localhost:3000/login`), inserisci **email** e **password** come nel `.env` (email senza spazi; viene normalizzata in minuscolo).

**Non riesci ad entrare?**

- Controlla che il frontend chiami la **stessa API** del backend (`NEXT_PUBLIC_API_URL` in `frontend/.env.local`; in locale `http://localhost:4100`).
- Dal browser prova `GET http://localhost:4100/api/health` (o il tuo host API): deve rispondere `{"status":"ok",...}`.
- Riesegui il seed dopo aver salvato `ADMIN_EMAIL` / `ADMIN_PASSWORD`:  
  `npm run db:seed --workspace=backend`

## Utenti di esempio dal seed (solo sviluppo)

> ⚠️ **Le password qui sotto sono pubbliche (stanno nel repository e in `backend/prisma/seed.ts`) e servono solo per lo sviluppo.** Non usarle mai in produzione: chiunque legga il codice le conosce.

| Ruolo | Email | Password |
|-------|-------|----------|
| Super Admin | `ADMIN_EMAIL` o `admin@crm.local` | `ADMIN_PASSWORD` o `Admin123!` |
| Commerciale | commerciale@crm.local | Commerciale123! |
| Tecnico | tecnico@crm.local | Tecnico123! |
| Cliente | cliente@demo.it | Cliente123! |

Prima di mettere online l'app:

- Imposta `ADMIN_EMAIL` e `ADMIN_PASSWORD` nel `.env` con valori tuoi **prima** di lanciare il seed. Se le variabili mancano, il seed usa `admin@crm.local` / `Admin123!`.
- Gli utenti Commerciale, Tecnico e Cliente vengono creati **solo** se nel `.env` c'è `SEED_DEMO_DATA=true` (altrimenti il seed crea solo l'admin). Le loro password sono fisse nel codice, non configurabili: non attivare `SEED_DEMO_DATA` in produzione, oppure cambiale/eliminali da **Utenti** subito dopo.
- Imposta `JWT_SECRET` e `JWT_REFRESH_SECRET` diversi da quelli di sviluppo (senza di essi il backend usa valori di ripiego noti, vedi `backend/src/config/index.ts`).

## Moduli implementati

- **Autenticazione:** login, logout, refresh token, recupero password, autenticazione a due fattori (rotte `/api/auth/2fa/*`), RBAC 7 ruoli (`SUPER_ADMIN`, `ADMIN`, `COMMERCIAL`, `TECHNICIAN`, `OPERATOR`, `WAREHOUSE`, `CLIENT`)
- **CRM Clienti:** anagrafica, tag, stato, timeline, ricerca
- **Preventivi:** voci, IVA, sconti, acconti, automazioni per categoria
- **Interventi & Report:** checklist, materiali, firme, scarico magazzino automatico
- **Magazzino:** giacenze, movimenti, alert sottoscorta, prodotti, servizi, magazzini (`/api/inventory`), stampa etichette
- **Noleggio:** un articolo è a noleggio se ha il flag `isRentable` oppure una categoria che inizia con "Noleggio" (`backend/src/constants/rental.ts`); l'unità predefinita è `gg` (prezzo al giorno). L'elenco è su `GET /api/inventory/rentals`; nel frontend le pagine sono `/inventory/rentals` e `/inventory/rentals/preparation`. Le categorie ammesse sono in `backend/src/constants/rentalCatalog.ts`
- **DDT (documenti di trasporto):** creazione, modifica, PDF e stampa (`/api/transport-documents`, pagine `/inventory/print/ddt`). Stati: bozza, emesso, consegnato, annullato. Causali: vendita, noleggio, deposito, comodato, reso, riparazione, altro. Numerazione automatica. L'API ha elenco, dettaglio, `GET /:id/pdf`, creazione, modifica (PATCH) ed eliminazione
- **Cataloghi fornitori:** caricamento di PDF di listini e cataloghi (categorie `ELECTRICAL` e `SECURITY`; ruolo del file: listino, catalogo, altro), lettura delle voci dal PDF e filtri per tecnologia (`/api/supplier-catalogs`). Dimensione massima del file: `CATALOG_MAX_FILE_SIZE` (default 150 MB)
- **Fatture fornitori:** registrazione con allegato PDF o immagine e stato di pagamento: da pagare, parziale, pagata, scaduta (`/api/supplier-bills`)
- **Spese clienti:** spese collegate ai clienti con allegato PDF o immagine, importo pagato e stato automatico: da pagare, parziale, pagata, scaduta (`/api/client-expenses`)
- **Ordini di lavoro (commesse):** collegati a cliente e preventivo; stati: bozza, pianificata, in corso, completata, annullata, fatturata; possono pianificare i giorni di lavoro sul calendario evitando sovrapposizioni (`/api/job-orders`)
- **Report giornalieri:** un report per giornata di lavoro, collegabile a una commessa anche dopo la creazione (`/api/daily-reports`, filtro `unlinked=1` per quelli non collegati)
- **Impianti Elettrici:** area separata con database proprio, vedi la sezione dedicata più sotto
- **Calendario:** eventi, interventi, scadenze
- **Area cliente:** dashboard privata (solo credenziali admin)
- **Home pubblica:** presentazione sintetica e link ad **Accedi** (nessuna registrazione pubblica)
- **Impostazioni:** testi home pubblica, logo/favicon, contatti footer, nome/colori
- **Audit log** e notifiche

## Area Impianti Elettrici (database separato)

L'area **Impianti Elettrici** usa lo **stesso schema Prisma** del CRM ma un **database diverso**, con dati separati. Si apre dal frontend su `/impianti-elettrici` (link dalla pagina `/seleziona-area`).

**Come funziona**

1. Nel `backend/.env` imposti **`DATABASE_URL_IE`** (stesso formato di `DATABASE_URL`, nome database diverso, es. `crm_impianti_elettrici`). Se è vuota l'area non funziona.
2. Il frontend invia l'intestazione **`X-Workspace: ie`** (la aggiunge `frontend/src/lib/api.ts` quando l'indirizzo della pagina inizia con `/impianti-elettrici`, vedi `frontend/src/lib/api-workspace.ts`). CORS la consente in `backend/src/app.ts`.
3. Il middleware `backend/src/middleware/workspaceDb.ts` guarda l'intestazione: se vale `ie` **e** il percorso inizia con uno di questi prefissi, la richiesta usa `DATABASE_URL_IE`:

   `/api/clients`, `/api/quotes`, `/api/inventory`, `/api/invoices`, `/api/transport-documents`, `/api/attachments`, `/api/payment-term-templates`, `/api/settings`, `/api/search`, `/api/job-orders`, `/api/daily-reports`, `/api/supplier-catalogs`, `/api/supplier-bills`, `/api/client-expenses`, `/api/payments`

4. Tutte le altre rotte (per esempio `/api/auth`, `/api/users`) usano sempre il database del CRM: **il login resta sul CRM**. Al primo accesso nell'area, l'utente viene copiato nel database IE e viene creato un magazzino predefinito "Magazzino Impianti Elettrici" (`backend/src/middleware/auth.ts`).
5. Se `DATABASE_URL_IE` manca, le rotte con `X-Workspace: ie` rispondono **503** con "Database Impianti Elettrici non configurato".

**Preparare il database IE**

```bash
# crea il database (script nel repo; scegli quello adatto al tuo sistema)
bash backend/scripts/setup-impianti-elettrici-db.sh      # Linux
# oppure backend/scripts/setup-impianti-elettrici-db.ps1  # Windows

npm run db:push:ie --workspace=backend    # crea le tabelle nel database IE
npm run db:seed:ie --workspace=backend    # dati iniziali
```

Non ho potuto eseguire questi script: prima di usarli leggi il contenuto dei file, che qui sono solo elencati.

## Deploy produzione

**Checklist deploy:** [`docs/COSA-FARE.md`](docs/COSA-FARE.md)  
**VPN privata (SSH/deploy da fuori casa):** [`docs/guida-vpn-privata-tailscale.md`](docs/guida-vpn-privata-tailscale.md)  
**API pubblica (Tailscale Funnel):** [`docs/guida-tailscale-funnel.md`](docs/guida-tailscale-funnel.md)  
Le guide su tunnel Cloudflare e Netlify non sono tutte ancora valide: lo stato di ognuna è in [`docs/README.md`](docs/README.md).  
Indice documentazione: [`docs/README.md`](docs/README.md)  
Guida Netlify **completa** (monorepo, UI Package directory, variabili, troubleshooting): [`docs/netlify-guida-completa.md`](docs/netlify-guida-completa.md).

Template variabili:

- `backend/.env.example` — variabili API (sviluppo e produzione, vedi commenti nel file)
- `frontend/.env.example` — variabili Netlify / locale
- [`docs/guida-email-smtp-completa.md`](docs/guida-email-smtp-completa.md) — Gmail SMTP, form contatti, deploy Mint, troubleshooting

### Frontend — Netlify

Il backend resta sul **VPS** (o Docker): solo il sito Next.js va su Netlify.

**Impostazioni chiave**

| Campo | Valore |
|--------|--------|
| Base directory | *(vuoto — root repo)* |
| Package directory | **`frontend`** |
| Build | [`frontend/netlify.toml`](frontend/netlify.toml): `npm ci` ottimizzato + solo workspace `crm-frontend` (**non** il backend) |

**Prima di push/deploy:** dalla root repo, `npm run verify:netlify` (stesso tipo di pipeline del frontend su Netlify). Su GitHub Actions i job backend e frontend sono **paralleli**.

**Variabili ambiente** (Site → Environment variables):

```
NEXT_PUBLIC_API_URL=https://api.tuodominio.it
NEXT_PUBLIC_APP_NAME=Nicolò Service
```

Senza slash finale. Usa **HTTPS** se l’API è in TLS.

**Backend (stesso progetto, sul server API)** — aggiorna `.env` produzione:

```
NODE_ENV=production
FRONTEND_URL=https://tu-sito.netlify.app
API_URL=https://api.tuodominio.it
```

Opzionale:

- `FRONTEND_URLS=url1,url2` — più domini (preview manuali).
- `TRUST_CROSS_SITE_COOKIES=true` — se frontend Netlify e API sono **domini diversi**, serve per i cookie di refresh (`SameSite=None; Secure`). L’API deve essere servita su **HTTPS**.
- `ALLOW_NETLIFY_PREVIEWS=true` — **oggi senza effetto**: `backend/src/app.ts` accetta già sempre le origini `https://*.netlify.app` (anche le deploy preview). Per limitare il CORS serve una modifica al codice.

**Checklist**

1. DNS / TLS attivi per API e per Netlify.
2. Firewall Postgres accetta solo il VPS dell’API (non Netlify direttamente).
3. JWT secrets diversi da sviluppo.

### Backend — VPS / Docker

```bash
cd backend
docker build -t crm-api .
docker run -p 4000:4000 --env-file .env crm-api
```

Oppure con docker-compose completo:
```bash
docker compose up -d
```

> **Da verificare prima di usare Docker** (non posso eseguire il codice, quindi è solo una lettura dei file):
> - `docker-compose.yml` pubblica la porta `4000:4000` e `backend/Dockerfile` espone la 4000, ma il backend ascolta sulla porta di `PORT`, che per default è **4100**: senza `PORT=4000` tra le variabili del servizio `api` la porta pubblicata non corrisponde.
> - Il `Dockerfile` avvia con `prisma migrate deploy`, ma in `backend/prisma/` **non esiste la cartella `migrations`**: lo schema va creato con `npm run db:push --workspace=backend`.

### PostgreSQL personale

Usa connection string nel formato:
```
postgresql://user:password@host:5432/crm_gestionale?schema=public
```

Aggiorna schema DB (produzione Mint: nessuna cartella `prisma/migrations`):
```bash
npm run db:push --workspace=backend
```
Oppure dalla root: `bash backend/scripts/upgrade-mint.sh`

### Backup automatico

```bash
npm run backup --workspace=backend
```

Richiede `pg_dump` installato sul server.

## Variabili d'ambiente (`backend/.env`)

Copia `backend/.env.example` in `backend/.env`. Le variabili lette dal codice (`backend/src/config/index.ts` e altri file del backend) sono:

| Variabile | Cosa fa | Default se manca |
|-----------|---------|------------------|
| `NODE_ENV` | `development` o `production` | `development` |
| `PORT` | Porta dell'API | `4100` |
| `API_URL` | URL pubblico dell'API | `http://localhost:4100` |
| `DATABASE_URL` | Database PostgreSQL del CRM | *(vuoto: obbligatoria)* |
| `DATABASE_URL_IE` | Database dell'area Impianti Elettrici | vuoto: area disattivata (503) |
| `DATABASE_CONNECT_TIMEOUT` | Timeout connessione in ms: compare solo come riga commentata nell'esempio, non è letta in `backend/src` | nessun effetto |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Chiavi dei token (min. 32 caratteri) | valori di sviluppo noti: da cambiare |
| `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | Durata dei token | `15m`, `7d` |
| `FRONTEND_URL` | Origine del frontend (CORS) | `http://localhost:3000` |
| `FRONTEND_URLS` | Altre origini, separate da virgola | nessuna |
| `TRUST_CROSS_SITE_COOKIES`, `COOKIE_SAMESITE` | Cookie cross-site (frontend e API su domini diversi, serve HTTPS) | cookie `lax` |
| `ALLOW_NETLIFY_PREVIEWS` | Presente nell'esempio, ma non letta dal codice: vedi nota sotto | nessun effetto |
| `UPLOAD_DIR` | Cartella degli upload | `backend/uploads` |
| `MAX_FILE_SIZE` | Dimensione massima upload (byte) | `10485760` (10 MB) |
| `CATALOG_MAX_FILE_SIZE` | Dimensione massima dei PDF dei cataloghi (byte) | 150 MB |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_FROM_NAME` | Invio email | host vuoto, porta `587` |
| `NOTIFY_EMAIL` | Destinatario delle notifiche del form contatti, se diverso da `SMTP_FROM` | `SMTP_FROM` |
| `BACKUP_DIR`, `BACKUP_RETENTION_DAYS` | Cartella e giorni di conservazione dei backup | `../backups`, `30` |
| `RCLONE_REMOTE`, `RCLONE_PATH` | Copia dei backup su Drive con rclone (opzionale) | non attiva |
| `LEAD_RETENTION_DAYS`, `ACTIVITY_LOG_RETENTION_DAYS` | Conservazione di richieste e audit log | `730`, `1095` giorni |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Primo utente SUPER_ADMIN creato dal seed | `admin@crm.local`, `Admin123!` |
| `SEED_DEMO_DATA` | `true` = il seed carica clienti, prodotti e utenti di esempio | non attivo |

Nell'esempio compaiono anche variabili usate solo dagli script di deploy sul server (non dal codice TypeScript dell'API): `CLOUDFLARE_TUNNEL_TOKEN`, `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`, `USE_TAILSCALE_FUNNEL`, `TAILSCALE_FUNNEL_URL`. Sono descritte nelle guide in `docs/`.

> **Nota su `ALLOW_NETLIFY_PREVIEWS`:** in `backend/src/app.ts` il CORS accetta già qualsiasi origine `https://*.netlify.app` con una regola fissa, senza leggere questa variabile. Nel backend non ho trovato nessun uso della variabile: l'esempio e le guide la citano, ma oggi non cambia il comportamento.

## API: elenco delle rotte

Tutte le rotte sono montate in `backend/src/app.ts` sotto `/api`. Le rotte di `/api/auth` (login, recupero password), `/api/public` e `/api/health` sono aperte; le altre richiedono il login (JWT) e un permesso per ruolo. Limiti attivi: 200 richieste ogni 15 minuti su `/api/`, 20 tentativi ogni 15 minuti su `/api/auth/login`, 10 richieste all'ora su `/api/public/contact`.

| Prefisso | Contenuto |
|----------|-----------|
| `GET /api/health` | Controllo stato (nessun login) |
| `/api/auth` | Login, refresh, logout, `me`, autenticazione a due fattori (`/2fa/status`, `/2fa/setup`, `/2fa/verify`), recupero e reset password |
| `/api/public` | Rotte pubbliche, tra cui `POST /api/public/contact` (form contatti) |
| `/api/users`, `/api/permissions` | Utenti e permessi |
| `/api/clients`, `/api/leads` | Clienti, richieste dal sito |
| `/api/quotes`, `/api/payment-term-templates`, `/api/payments` | Preventivi, modelli di pagamento, pagamenti |
| `/api/invoices` | Fatture (bozze) |
| `/api/inventory` | Magazzino: movimenti, prodotti, noleggi (`/rentals`), servizi, magazzini |
| `/api/transport-documents` | DDT, con PDF (`/:id/pdf`) |
| `/api/supplier-catalogs` | Cataloghi e listini fornitori (PDF) |
| `/api/supplier-bills` | Fatture fornitori |
| `/api/client-expenses` | Spese clienti |
| `/api/job-orders` | Ordini di lavoro (commesse) |
| `/api/daily-reports` | Report giornalieri |
| `/api/interventions`, `/api/site-visits` | Interventi e report tecnici, sopralluoghi |
| `/api/events`, `/api/event-gallery` | Calendario, galleria eventi |
| `/api/dashboard`, `/api/search`, `/api/notifications` | KPI, ricerca globale, notifiche |
| `/api/portal` | Area cliente |
| `/api/settings`, `/api/automation` | Impostazioni, regole automatiche dei preventivi |
| `/api/uploads`, `/api/attachments` | Upload e allegati. I file sono serviti anche su `/uploads` (fuori da `/api`) |
| `/api/activity-logs` | Audit log |
| `/api/privacy` | Versione dell'informativa (`/version`) e pulizia dati (`/maintenance`) |
| `/api/backup` | Avvio di un backup (`POST /trigger`) |

I moduli nuovi (`transport-documents`, `job-orders`, `daily-reports`, `supplier-catalogs`, `supplier-bills`, `client-expenses`) espongono lo schema `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id` (i DDT in più il PDF; i cataloghi hanno anche altre rotte nel file `supplierCatalogs.ts`).

Il dettaglio di ogni sotto-rotta è nei file in `backend/src/routes/`.

## Test

Dalla radice del repository:

```bash
npm test --workspace=backend
```

Il comando esegue `tsx --test src/**/*.test.ts` (runner di Node, nessun database richiesto). Oggi esiste **un solo file di test**, `backend/src/utils/queryInput.test.ts` (pulizia dei termini di ricerca, identificatori, paginazione). Per lanciare solo quello: `npm run test:security --workspace=backend`.

La CI di GitHub (`.github/workflows/ci.yml`) **non esegue i test**: compila solo backend e frontend.

## Sicurezza

- Nessuna registrazione pubblica
- Solo admin crea utenti e account cliente
- JWT short-lived + refresh token in cookie httpOnly (cross-domain Netlify → imposta `TRUST_CROSS_SITE_COOKIES` + HTTPS API)
- Rate limiting su login e API
- Helmet + CORS configurato
- Permessi granulari per ruolo

## Licenza

Proprietario — uso commerciale su licenza.
