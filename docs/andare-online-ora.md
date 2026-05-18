# Andare online — Nicolò Service (guida completa)

Questa guida mette in produzione l’intero sistema:

| Componente | Dove gira | URL |
|------------|-----------|-----|
| **Frontend** (sito + area riservata) | Netlify | https://nicoloservice.netlify.app |
| **API** + upload + email | Server Mint (casa) | Esposta via **Cloudflare Tunnel** (HTTPS) |
| **Database** | PostgreSQL sul Mint | Solo in rete locale (`127.0.0.1` o LAN) |

Senza API raggiungibile in **HTTPS**, il sito Netlify si apre ma **login, preventivi, calendario e logo** non funzionano.

---

## Panoramica (ordine consigliato)

1. **Windows** — commit e push su GitHub  
2. **Mint** — `git pull`, schema DB, deploy API + tunnel  
3. **Netlify** — `NEXT_PUBLIC_API_URL` uguale a `API_URL`, rideploy  
4. **Impostazioni** — logo e testi home  
5. **Verifica** — healthcheck, login, home pubblica  

---

## Parte 1 — Sul PC Windows (codice su GitHub)

### 1.1 Controlla le modifiche

```powershell
cd "D:\CRM APP"
git status
git diff
```

**Non committare** `backend/.env` (contiene password e segreti).

### 1.2 Commit e push

```powershell
cd "D:\CRM APP"
git add -A
git status
git commit -m "Descrizione breve delle modifiche (es. preventivi, calendario, logo home)"
git push origin main
```

Se `git push` fallisce, usa il token GitHub o SSH già configurato.

### 1.3 Build locale (opzionale, per sicurezza)

```powershell
cd "D:\CRM APP\frontend"
npm run build
```

Se il build passa su Windows, Netlify di solito compila senza problemi.

---

## Parte 2 — Sul server Mint (API + database + tunnel)

Collegati al Mint:

```powershell
ssh nicolo@192.168.1.53
```

(Sostituisci utente/IP se diversi.)

### 2.1 Aggiorna il codice

```bash
cd ~/CRM-APP
git pull origin main
```

Se `git pull` è bloccato da modifiche locali sul server:

```bash
cd ~/CRM-APP
git fetch origin
git reset --hard origin/main
```

### 2.2 File `.env` del backend

Il file sta qui (non sul PC Windows):

```text
/home/nicolo/CRM-APP/backend/.env
```

```bash
nano ~/CRM-APP/backend/.env
```

**Esempio produzione senza dominio acquistato** (tunnel trycloudflare):

```env
NODE_ENV=production
PORT=4100

# URL pubblico HTTPS del tunnel (deve coincidere con Netlify)
API_URL=https://QUALCOSA.trycloudflare.com

FRONTEND_URL=https://nicoloservice.netlify.app
TRUST_CROSS_SITE_COOKIES=true
ALLOW_NETLIFY_PREVIEWS=true

DATABASE_URL=postgresql://UTENTE:PASSWORD@127.0.0.1:5432/crm_gestionale?schema=public

JWT_SECRET=stringa-lunga-minimo-32-caratteri
JWT_REFRESH_SECRET=altra-stringa-lunga-minimo-32-caratteri

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tuaemail@gmail.com
SMTP_PASS=password-per-le-app-gmail
SMTP_FROM=tuaemail@gmail.com
SMTP_FROM_NAME=Nicolò Service

UPLOAD_DIR=./uploads
```

Salva: `Ctrl+O` → Invio → `Ctrl+X`.

Modello completo: `backend/.env.example` nel repository.

### 2.3 Schema database (nuove colonne / tabelle)

Dopo ogni aggiornamento che tocca Prisma:

```bash
cd ~/CRM-APP/backend
npx prisma db push
```

### 2.4 Deploy completo (consigliato)

Un solo comando fa pull (se non saltato), `prisma db push`, build API, PM2 e tunnel:

```bash
cd ~/CRM-APP
chmod +x backend/scripts/*.sh
./backend/scripts/deploy-completo-mint.sh
```

Alla fine lo script stampa:

- stato **healthcheck** locale e pubblico  
- valore da usare su Netlify: `NEXT_PUBLIC_API_URL=...`  
- comando `pm2 list`  

### 2.5 Se PM2 è vuoto o vedi errore Cloudflare **1033**

L’errore **1033** significa che l’URL trycloudflare in `.env` / Netlify **non è più attivo** (tunnel ricreato o server riavviato).

```bash
cd ~/CRM-APP
git pull origin main
chmod +x backend/scripts/*.sh
./backend/scripts/fix-tunnel-1033.sh
```

Oppure ripristino completo:

```bash
./backend/scripts/ripristina-mint-pm2.sh
./backend/scripts/aggiorna-url-tunnel.sh
```

Poi copia il **nuovo** `API_URL` da:

```bash
grep API_URL ~/CRM-APP/backend/.env
pm2 logs crm-tunnel --lines 30
```

Guida dettagliata: [`ripristino-pm2-tunnel-1033.md`](./ripristino-pm2-tunnel-1033.md).

### 2.6 Boot automatico dopo riavvio Mint (una volta)

```bash
pm2 startup
# Esegui la riga sudo che PM2 stampa
pm2 save
```

### 2.7 Primo utente admin (solo prima installazione)

```bash
cd ~/CRM-APP/backend
npm run db:seed --workspace=backend
```

Usa `ADMIN_EMAIL` e `ADMIN_PASSWORD` definiti nel `.env` (o i default del seed).

---

## Parte 3 — Netlify (frontend pubblico)

### 3.1 Variabili d’ambiente

1. Apri [app.netlify.com](https://app.netlify.com) → sito **nicoloservice**  
2. **Site configuration → Environment variables**  

| Chiave | Valore | Note |
|--------|--------|------|
| `NEXT_PUBLIC_API_URL` | Stesso URL di `API_URL` sul Mint | Es. `https://xxx.trycloudflare.com` — **senza** `/` finale |
| `NEXT_PUBLIC_APP_NAME` | `Nicolò Service` | Opzionale |
| `NEXT_PUBLIC_LOGO_URL` | URL completo del logo | Opzionale se il logo non arriva dall’API |

### 3.2 Rideploy

**Deploys → Trigger deploy → Clear cache and deploy site**

Fallo **ogni volta** che cambi `NEXT_PUBLIC_API_URL` o fai push importanti sul frontend.

### 3.3 Aggiornare l’URL API da Windows (script)

Dopo `fix-tunnel-1033.sh` sul Mint, dal PC:

```powershell
cd "D:\CRM APP"
.\scripts\netlify-aggiorna-api-url.ps1 "https://NUOVO-URL.trycloudflare.com"
```

Richiede Netlify CLI installata e login (`netlify login`).

In alternativa, imposta la variabile a mano nel pannello Netlify e fai **Clear cache and deploy**.

---

## Parte 4 — Logo e home pubblica

1. Accedi all’area riservata: https://nicoloservice.netlify.app/login  
2. **Impostazioni** → carica il **logo** aziendale  
3. Apri la **home** https://nicoloservice.netlify.app in finestra anonima  

Il logo in header dipende da:

- API online (`/api/settings/public` raggiungibile)  
- `NEXT_PUBLIC_API_URL` corretto su Netlify  

Se vedi solo la **“N”** blu, di solito l’API non risponde o il tunnel è scaduto (errore 1033).

---

## Parte 5 — Verifica che tutto funzioni

### 5.1 API

Sul Mint:

```bash
curl -s http://127.0.0.1:4100/api/health
curl -s "$(grep ^API_URL= ~/CRM-APP/backend/.env | cut -d= -f2-)/api/health"
```

Risposta attesa: `{"status":"ok",...}`

### 5.2 Frontend

1. Home: https://nicoloservice.netlify.app — footer solo copyright (senza riga contatti ripetuta)  
2. Login: credenziali admin  
3. **Calendario** — eventi visibili; click su evento → pannello collegamenti  
4. **Preventivo** — conferma → evento in calendario (se impostata **Data evento** o alla data di accettazione)  
5. **Portale cliente** — conferma/rifiuto preventivo  

### 5.3 Browser (F12)

Tab **Network** durante il login: le richieste devono andare a  
`https://....trycloudflare.com/api/...`  
e **non** a `localhost`.

---

## Riepilogo rapido (checklist)

- [ ] `git push origin main` da Windows  
- [ ] `git pull` (o `reset --hard origin/main`) sul Mint  
- [ ] `backend/.env` con `API_URL`, `FRONTEND_URL`, DB, JWT, SMTP  
- [ ] `npx prisma db push` (o incluso in `deploy-completo-mint.sh`)  
- [ ] `./backend/scripts/deploy-completo-mint.sh`  
- [ ] `API_URL` Mint = `NEXT_PUBLIC_API_URL` Netlify  
- [ ] Netlify: **Clear cache and deploy**  
- [ ] Logo caricato in Impostazioni  
- [ ] `curl .../api/health` OK  
- [ ] Login da Netlify OK  
- [ ] `pm2 startup` + `pm2 save` (una volta)  

---

## Problemi frequenti

| Problema | Causa probabile | Cosa fare |
|----------|-----------------|-----------|
| Login fallisce da Netlify | API_URL sbagliato o tunnel morto | `fix-tunnel-1033.sh`, aggiorna Netlify |
| Cloudflare **1033** | URL trycloudflare vecchio | Nuovo tunnel + allinea `.env` e Netlify |
| Logo solo “N” blu | API non raggiungibile | Healthcheck tunnel; verifica impostazioni logo |
| `git pull` rifiutato | File modificati sul Mint | `git reset --hard origin/main` (perdi modifiche locali sul server) |
| PM2 vuoto dopo reboot | Manca `pm2 startup` | `ripristina-mint-pm2.sh` poi `pm2 save` |
| Email preventivi non parte | SMTP errato in `.env` | Guida [`guida-email-smtp-completa.md`](./guida-email-smtp-completa.md) |

---

## Altre guide nel progetto

| Documento | Contenuto |
|-----------|-----------|
| [`COSA-FARE.md`](./COSA-FARE.md) | Flusso operativo giornaliero |
| [`guida-deploy-mint-netlify-cloudflare.md`](./guida-deploy-mint-netlify-cloudflare.md) | Deploy dettagliato + Gmail + backup |
| [`ripristino-pm2-tunnel-1033.md`](./ripristino-pm2-tunnel-1033.md) | Emergenza tunnel / PM2 |
| [`netlify-guida-completa.md`](./netlify-guida-completa.md) | Solo Netlify |
| [`guida-tunnel-permanente-pm2.md`](./guida-tunnel-permanente-pm2.md) | Tunnel con dominio Cloudflare |

---

## Architettura (schema)

```text
Utente browser
    │
    ▼
https://nicoloservice.netlify.app  (Next.js su Netlify)
    │  NEXT_PUBLIC_API_URL
    ▼
https://xxx.trycloudflare.com  (Cloudflare Tunnel)
    │
    ▼
Mint :4100  (Node API + PM2 crm-api)
    │
    ▼
PostgreSQL :5432  (crm_gestionale)
```

Quando avrai un dominio proprio (`api.tuodominio.it`), sostituisci trycloudflare in `API_URL` e `NEXT_PUBLIC_API_URL` e segui [`guida-tunnel-permanente-pm2.md`](./guida-tunnel-permanente-pm2.md).
