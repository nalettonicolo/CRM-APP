# Guida completa: Mint + Cloudflare + Netlify + Gmail + Drive

Un comando per volta. Esegui sul **server Mint** salvo dove scritto **Windows**.

---

## A. Come si raggiunge il file `.env` sul Mint

Il file non è sul PC Windows: sta sul **server Linux**, percorso:

```text
/home/nicolo/CRM-APP/backend/.env
```

### Passo A1 — Collegati al server (da Windows PowerShell)

```powershell
ssh nicolo@192.168.1.53
```

### Passo A2 — Vai nella cartella del backend

```bash
cd ~/CRM-APP/backend
```

### Passo A3 — Apri il file con l’editor nano

```bash
nano ~/CRM-APP/backend/.env
```

- Cancella tutto: tieni premuto `Ctrl+K` più volte, oppure `Ctrl+A` poi `Ctrl+K`
- Incolla il blocco dalla sezione **B** di questa guida (o da `docs/mint-env-template.env` dopo aver compilato i campi `[ ... ]`)
- Salva: `Ctrl+O` → Invio
- Esci: `Ctrl+X`

### Passo A4 — Verifica che il file esista

```bash
ls -la ~/CRM-APP/backend/.env
```

---

## B. Contenuto `.env` per Mint (da incollare in nano)

Vedi file `docs/mint-env-template.env` nel repository.

Differenze importanti rispetto al PC Windows:

| Voce | Su Mint | Su Windows (dev) |
|------|---------|------------------|
| `DATABASE_URL` host | `127.0.0.1` | spesso `192.168.1.53` |
| `NODE_ENV` | `production` | `development` |
| `API_URL` | URL tunnel Cloudflare | uguale |

---

## C. Tunnel veloce (Piano A — quello che usi ora)

URL attuale (esempio): `https://revenues-monitors-speaks-sword.trycloudflare.com`

### Passo C1 — Sul Mint, avvia il tunnel (terminale dedicato, lascialo aperto)

```bash
cloudflared tunnel --url http://127.0.0.1:4100
```

### Passo C2 — Copia l’URL che compare (se diverso, aggiorna `API_URL` nel `.env`)

### Passo C3 — Test API dal Mint

```bash
curl -s https://revenues-monitors-speaks-sword.trycloudflare.com/api/health
```

Risposta attesa: `{"status":"ok",...}`

**Limite Piano A:** se chiudi il terminale o manca corrente, il tunnel muore e l’URL può cambiare al riavvio.

---

## D. Tunnel permanente (Piano B — consigliato)

URL **fisso** (non cambia a ogni riavvio). Serve account Cloudflare gratuito.

### Passo D1 — Login Cloudflare sul Mint

```bash
cloudflared tunnel login
```

Apri il link nel browser, autorizza, scegli il dominio (se ne hai uno su Cloudflare).

### Passo D2 — Crea il tunnel nominato

```bash
cloudflared tunnel create crm-nicolo-service
```

Annota l’**UUID** del tunnel (es. `a1b2c3d4-...`).

### Passo D3 — Crea cartella config

```bash
mkdir -p ~/.cloudflared
```

### Passo D4 — Crea file config (sostituisci UUID e hostname)

```bash
nano ~/.cloudflared/config.yml
```

Esempio (con **tuo dominio** su Cloudflare, es. `api.tuodominio.it`):

```yaml
tunnel: crm-nicolo-service
credentials-file: /home/nicolo/.cloudflared/<UUID>.json

ingress:
  - hostname: api.tuodominio.it
    service: http://127.0.0.1:4100
  - service: http_status:404
```

Senza dominio proprio: nel pannello Cloudflare Zero Trust puoi assegnare un hostname `xxxx.cfargotunnel.com` al tunnel.

### Passo D5 — Record DNS (se hai dominio su Cloudflare)

```bash
cloudflared tunnel route dns crm-nicolo-service api.tuodominio.it
```

### Passo D6 — Avvia tunnel permanente con PM2

```bash
pm2 start cloudflared --name crm-tunnel -- tunnel --config /home/nicolo/.cloudflared/config.yml run
```

### Passo D7 — Salva PM2 al riavvio

```bash
pm2 save
```

### Passo D8 — Aggiorna `.env` Mint con URL fisso

```bash
nano ~/CRM-APP/backend/.env
```

Imposta:

```env
API_URL=https://api.tuodominio.it
```

### Passo D9 — Riavvia API

```bash
pm2 restart crm-api --update-env
```

Su **Netlify** imposti lo stesso URL in `NEXT_PUBLIC_API_URL` (una volta sola).

---

## E. Aggiornare API dopo modifiche codice

### Passo E1 — Git pull sul Mint

```bash
cd ~/CRM-APP
```

```bash
git pull origin main
```

### Passo E2 — Build backend

```bash
cd ~/CRM-APP/backend
```

```bash
npm ci
```

```bash
npm run build
```

### Passo E3 — Riavvia API

```bash
pm2 restart crm-api --update-env
```

### Passo E4 — Controlla log

```bash
pm2 logs crm-api --lines 30
```

---

## F. Push codice da Windows

### Passo F1

```powershell
cd "D:\CRM APP"
```

### Passo F2

```powershell
git add -A
```

### Passo F3

```powershell
git commit -m "Menu mobile, Gmail SMTP, backup Drive, trust proxy"
```

### Passo F4

```powershell
git push origin main
```

Poi ripeti sezione **E** sul Mint.

---

## G. Netlify (deploy frontend)

1. Apri https://app.netlify.com → sito **nicoloservice**
2. **Site configuration** → **Environment variables**
3. `NEXT_PUBLIC_API_URL` = `https://revenues-monitors-speaks-sword.trycloudflare.com`  
   (o URL Piano B fisso quando attivo)
4. `NEXT_PUBLIC_APP_NAME` = `Nicolò Service`
5. **Deploys** → **Trigger deploy** → **Clear cache and deploy site**

---

## H. Gmail SMTP

### Passo H1 — Password per le app (browser)

https://myaccount.google.com/apppasswords

### Passo H2 — Inserisci in `.env` Mint oppure Impostazioni app

Valori Gmail:

- Host: `smtp.gmail.com`
- Porta: `587`
- Utente / Mittente: `nalettonicolo@gmail.com`
- Password: **solo password app** (16 caratteri)

### Passo H3 — Riavvia API dopo `.env`

```bash
pm2 restart crm-api --update-env
```

### Passo H4 — Test dall’app

Login admin → **Impostazioni** → **Salva SMTP** → **Invia email di test**

---

## I. Backup ogni 5 giorni + Google Drive

### Passo I1 — Installa rclone (Mint, una volta)

```bash
sudo apt update
```

```bash
sudo apt install -y rclone postgresql-client
```

### Passo I2 — Configura Google Drive

```bash
rclone config
```

Nome remote: `gdrive`

### Passo I3 — Prova backup manuale

```bash
cd ~/CRM-APP/backend/scripts
```

```bash
chmod +x scheduled-backup.sh install-backup-cron.sh
```

```bash
./scheduled-backup.sh
```

### Passo I4 — Attiva cron ogni 5 giorni

```bash
./install-backup-cron.sh
```

### Passo I5 — Verifica

```bash
crontab -l
```

```bash
ls -la ~/CRM-APP/backups/
```

```bash
rclone ls gdrive:CRM-Backups
```

---

## J. Prova finale da telefono

1. Apri https://nicoloservice.netlify.app/login
2. Login admin
3. Menu **☰** in alto a sinistra (non sidebar fissa)
4. Impostazioni → test email

---

## Ordine consigliato oggi

1. A → B (`.env` su Mint)  
2. C (tunnel) + E3 (pm2 api)  
3. F (push Windows) + E (pull/build Mint)  
4. G (Netlify)  
5. H (Gmail test)  
6. I (backup + Drive)  
7. Pianifica D (tunnel permanente) quando hai dominio Cloudflare
