# Cosa fare — Nicolò Service CRM

Guida operativa dopo lo sviluppo delle **fasi 1–5**. Segui i passaggi **in ordine**.

---

## 1. Sul PC Windows (codice)

### 1.1 Verifica locale (opzionale)

```powershell
cd "D:\CRM APP"
npm ci
cd backend
npm run build
npx prisma db push
npm run db:seed
cd ..\frontend
$env:NODE_ENV="production"
npm run build
```

### 1.2 Invia tutto su GitHub

```powershell
cd "D:\CRM APP"
git add -A
git status
git commit -m "Fasi 3-5: calendario, report mobile, fatture, portale, PWA, backup"
git push origin main
```

Se `git push` chiede credenziali, usa il token GitHub o SSH già configurato.

---

## 2. Sul server Linux Mint (API + database)

Collegati in SSH:

```bash
ssh nicolo@192.168.1.53
```

### 2.1 Aggiorna il codice

```bash
cd ~/CRM-APP
git pull origin main
```

### 2.2 Aggiorna database (nuove colonne 2FA, ecc.)

```bash
cd ~/CRM-APP/backend
npm ci
npx prisma db push
```

> Se `prisma generate` dà errore EPERM, ferma prima l’API: `pm2 stop crm-api`

### 2.3 Ricompila e riavvia API

```bash
npm run build
pm2 restart crm-api --update-env
pm2 logs crm-api --lines 30
```

Verifica:

```bash
curl -s http://127.0.0.1:4100/api/health
```

Deve rispondere `{"status":"ok",...}` (porta **4100** se l’hai lasciata così nel `.env`).

### 2.4 Tunnel Cloudflare (accesso da Internet)

Il tunnel **quick** si chiude se chiudi il terminale. Per usarlo ora:

```bash
cloudflared tunnel --url http://127.0.0.1:4100
```

Copia l’URL `https://....trycloudflare.com` e aggiorna:

**File `~/CRM-APP/backend/.env`:**

```env
API_URL=https://TUO-URL-TUNNEL.trycloudflare.com
FRONTEND_URL=https://nicoloservice.netlify.app
PORT=4100
TRUST_CROSS_SITE_COOKIES=true
ALLOW_NETLIFY_PREVIEWS=true
```

Poi:

```bash
pm2 restart crm-api --update-env
```

Test dall’esterno:

```bash
curl -s https://TUO-URL-TUNNEL.trycloudflare.com/api/health
```

> **Consiglio a medio termine:** tunnel Cloudflare permanente o dominio + Nginx, così l’URL non cambia ogni volta.

### 2.5 Backup manuale (da impostazioni o terminale)

Da terminale sul server:

```bash
cd ~/CRM-APP/backend
npm run backup
```

Oppure dall’app: **Impostazioni → Backup → Esegui backup** (solo admin).

---

## 3. Su Netlify (sito web)

1. Vai su [app.netlify.com](https://app.netlify.com) → sito **nicoloservice**
2. **Site configuration → Environment variables**
   - `NEXT_PUBLIC_API_URL` = **stesso URL tunnel HTTPS** (es. `https://xxx.trycloudflare.com`)
   - `NEXT_PUBLIC_APP_NAME` = `Nicolò Service`
3. **Deploys → Trigger deploy → Clear cache and deploy site**
4. Attendi deploy **Published** (verde)

Apri: https://nicoloservice.netlify.app

---

## 4. Primo accesso e configurazione

| Cosa | Dove |
|------|------|
| Login admin | `/login` — credenziali da seed (`ADMIN_EMAIL` / `ADMIN_PASSWORD` nel `.env` server) |
| Logo grande in home | **Impostazioni → Logo** (poi rideploy Netlify se non vedi subito: svuota cache) |
| SMTP email reali | **Impostazioni → Email SMTP** (host, porta, utente, password) |
| Colori aziendali | **Impostazioni → Colori** (si applicano al tema) |
| Utenti staff | **Utenti** (solo Admin) |
| Account cliente portale | **Utenti → Nuovo** con ruolo **CLIENT** e `clientId` collegato |
| Regole preventivi auto | **Impostazioni → Automazioni** o `/settings/automation` |
| Lead da form sito | **Richieste** (`/leads`) → **Crea cliente** |

---

## 5. Funzionalità ora disponibili (riepilogo)

### Staff (sidebar)
- Dashboard con widget personalizzabili
- Clienti, preventivi (PDF + email), interventi, report (compilazione mobile + PDF)
- Magazzino + **Prodotti**
- **Fatture** (bozza non fiscale da preventivo accettato)
- Calendario mensile (sposta eventi trascinando)
- **Richieste**, **Audit log**, **Utenti**
- Ricerca globale in header
- Notifiche (campanella)

### Area cliente (`/portal`)
- Preventivi (download PDF, firma se inviato)
- Report, documenti, appuntamenti (conferma)

### Pubblico
- Landing con logo grande
- Form contatto → lead in gestionale

---

## 6. Checklist `.env` server (`backend/.env`)

```env
DATABASE_URL=postgresql://...
PORT=4100
API_URL=https://....trycloudflare.com
FRONTEND_URL=https://nicoloservice.netlify.app
JWT_SECRET=... (32+ caratteri)
JWT_REFRESH_SECRET=...
TRUST_CROSS_SITE_COOKIES=true
ALLOW_NETLIFY_PREVIEWS=true
ADMIN_EMAIL=...
ADMIN_PASSWORD=...

# Email (opzionale ma consigliato)
SMTP_HOST=smtp.tuoprovider.it
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=noreply@tuodominio.it
SMTP_FROM_NAME=Nicolò Service
```

---

## 7. Se qualcosa non funziona

| Problema | Soluzione |
|----------|-----------|
| Login “rete / API” | Tunnel spento o `NEXT_PUBLIC_API_URL` sbagliato su Netlify |
| 401 dopo login | `TRUST_CROSS_SITE_COOKIES=true` + redeploy Netlify |
| PDF / email non partono | Configura SMTP; senza SMTP l’API simula solo in log |
| Allegati non caricano | Cartella `uploads` scrivibile sul server; `pm2` user con permessi |
| Errori Prisma | `npx prisma db push` sul server dopo ogni pull importante |
| Build Netlify fallisce | Controlla log; in locale: `$env:NODE_ENV="production"; npm run build --workspace=crm-frontend` |

---

## 8. Ordine consigliato domani mattina

1. `git push` da Windows  
2. `git pull` + `prisma db push` + `npm run build` + `pm2 restart` sul Mint  
3. Avvia **cloudflared** e aggiorna URL in `.env` + Netlify  
4. **Clear cache deploy** Netlify  
5. Login → carica logo → prova un preventivo PDF + un report da tablet/telefono  
6. Crea un utente **CLIENT** di prova e verifica `/portal`

---

## 9. Ancora da perfezionare (opzionale)

- Tunnel permanente (non quick)  
- Icone PWA reali in `frontend/public/icon-192.png` e `icon-512.png`  
- Test automatici CI  
- Permessi 100% da database (oggi: ruoli + mappa statica + seed)  
- Barcode/QR con lettore camera (campi DB pronti, UI base)  

Il gestionale è **usabile in produzione** per l’uso quotidiano; le voci sopra sono miglioramenti, non blocchi.
