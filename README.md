# NexusCRM — Gestionale SaaS Enterprise

Piattaforma gestionale multi-utente per CRM, preventivi, interventi tecnici, magazzino, calendario operativo e area clienti privata.

## Stack

| Layer | Tecnologie |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4, Shadcn-style UI, Framer Motion, TanStack Query, Zustand |
| Backend | Node.js, Express 5, Prisma ORM, JWT + Refresh Token, Bcrypt |
| Database | PostgreSQL (server personale o Docker) |
| Deploy | Netlify (frontend), VPS/Docker/Railway/Render (API) |

## Struttura progetto

```
crm-gestionale-saas/
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

Oppure setup automatico:
```bash
node scripts/setup.js
```

### 4. Avvio sviluppo

```bash
npm run dev
```

- **Frontend:** http://localhost:3000
- **API:** http://localhost:4000
- **Health check:** http://localhost:4000/api/health

### PostgreSQL: nome database con accenti / spazio

Il database **`Nicolò Service`** sul server è valido e raggiungibile (lo confermano anche `psql` e il driver `pg`). Con **Prisma**, invece, la stessa connessione può fallire con messaggi fuorvianti tipo *database non esiste*.

**Soluzione consigliata per NexusCRM:** crea un database **solo ASCII**, ad esempio **`crm_gestionale`**, e usalo in `DATABASE_URL`.

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

Diagnostica (prova più nomi DB con `pg`): `npm run db:debug`

## Credenziali demo (dopo seed)

| Ruolo | Email | Password |
|-------|-------|----------|
| Super Admin | admin@crm.local | Admin123! |
| Commerciale | commerciale@crm.local | Commerciale123! |
| Tecnico | tecnico@crm.local | Tecnico123! |
| Cliente | cliente@demo.it | Cliente123! |

> Cambia le password in produzione.

## Moduli implementati

- **Autenticazione:** login, logout, refresh token, recupero password, RBAC 7 ruoli
- **CRM Clienti:** anagrafica, tag, stato, timeline, ricerca
- **Preventivi:** voci, IVA, sconti, acconti, automazioni per categoria
- **Interventi & Report:** checklist, materiali, firme, scarico magazzino automatico
- **Magazzino:** giacenze, movimenti, alert sottoscorta
- **Calendario:** eventi, interventi, scadenze
- **Area cliente:** dashboard privata (solo credenziali admin)
- **Landing pubblica:** solo modulo contatto (nessuna registrazione)
- **Impostazioni:** branding, dati azienda, SMTP
- **Audit log** e notifiche

## Deploy produzione

Guida Netlify **completa** (monorepo, UI Package directory, variabili, troubleshooting): [`docs/netlify-guida-completa.md`](docs/netlify-guida-completa.md).

Template variabili:

- `backend/.env.production.example` — API produzione  
- `frontend/.env.production.example` — riferimento variabili Netlify  

### Frontend — Netlify

Il backend resta sul **VPS** (o Docker): solo il sito Next.js va su Netlify.

**Impostazioni chiave**

| Campo | Valore |
|--------|--------|
| Base directory | *(vuoto — root repo)* |
| Package directory | **`frontend`** |
| Build | [`frontend/netlify.toml`](frontend/netlify.toml): `npm ci` + solo workspace `crm-frontend` (**non** il backend) |

**Variabili ambiente** (Site → Environment variables):

```
NEXT_PUBLIC_API_URL=https://api.tuodominio.it
NEXT_PUBLIC_APP_NAME=NexusCRM
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
- `ALLOW_NETLIFY_PREVIEWS=true` — consente origini `*.netlify.app` (deploy preview); solo se ti va bene dal punto di vista sicurezza.

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

### PostgreSQL personale

Usa connection string nel formato:
```
postgresql://user:password@host:5432/crm_gestionale?schema=public
```

Esegui migrazioni:
```bash
npm run db:migrate:prod --workspace=backend
```

### Backup automatico

```bash
npm run backup --workspace=backend
```

Richiede `pg_dump` installato sul server.

## API principali

| Endpoint | Descrizione |
|----------|-------------|
| `POST /api/auth/login` | Login |
| `POST /api/auth/refresh` | Refresh token |
| `GET /api/clients` | Lista clienti |
| `GET /api/quotes` | Preventivi |
| `GET /api/interventions` | Interventi |
| `GET /api/interventions/reports` | Report tecnici |
| `GET /api/inventory` | Magazzino |
| `GET /api/dashboard/stats` | KPI dashboard |
| `GET /api/portal/dashboard` | Area cliente |
| `POST /api/public/contact` | Form contatto (pubblico) |

## Sicurezza

- Nessuna registrazione pubblica
- Solo admin crea utenti e account cliente
- JWT short-lived + refresh token in cookie httpOnly (cross-domain Netlify → imposta `TRUST_CROSS_SITE_COOKIES` + HTTPS API)
- Rate limiting su login e API
- Helmet + CORS configurato
- Permessi granulari per ruolo

## Licenza

Proprietario — uso commerciale su licenza.
