# Gmail SMTP + backup automatico (Mint + Google Drive)

> **Guida passo-passo completa (SMTP, form contatti, deploy Mint, troubleshooting):**  
> vedi [`guida-email-smtp-completa.md`](./guida-email-smtp-completa.md)

## Parte 1 — Email con Gmail

### 1. Password per le app (obbligatoria)

Gmail **non** accetta la password normale per SMTP se hai la verifica in due passaggi.

1. Vai su https://myaccount.google.com/apppasswords  
2. Accedi con `nalettonicolo@gmail.com` (o l’account che usi)  
3. Crea password app → nome: **CRM Nicolò Service**  
4. Copia la password di **16 caratteri** (es. `abcd efgh ijkl mnop`)

### 2. Valori SMTP Gmail

| Campo | Valore |
|--------|--------|
| Host | `smtp.gmail.com` |
| Porta | `587` |
| SSL/TLS diretto | **No** (usa STARTTLS su 587) |
| Utente | la tua email Gmail completa |
| Password | password per le app (16 caratteri) |
| Mittente | stessa email Gmail |
| Nome mittente | `Nicolò Service` |

### 3. Dove configurarli

**Opzione A — File `.env` sul Mint** (`~/CRM-APP/backend/.env`):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=nalettonicolo@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
SMTP_FROM=nalettonicolo@gmail.com
SMTP_FROM_NAME=Nicolò Service
```

Poi: `pm2 restart crm-api --update-env`

**Opzione B — Impostazioni nell’app** (consigliata):  
Login admin → **Impostazioni** → sezione **SMTP Gmail** → compila e **Salva SMTP** → **Invia email di test**.

I valori salvati in app hanno priorità sul `.env`.

### 4. Verifica

- Pulsante **Invia email di test** in Impostazioni  
- Oppure: recupero password / invio preventivo PDF

---

## Parte 2 — Backup ogni 5 giorni

### Cosa fa

1. `pg_dump` → file `.sql` in `~/CRM-APP/backups/`  
2. Elimina backup locali più vecchi di **30 giorni** (configurabile con `BACKUP_RETENTION_DAYS`)  
3. Se **rclone** è configurato → copia i file su **Google Drive** in cartella `CRM-Backups`

### Installazione su Mint (una tantum)

```bash
# Strumenti
sudo apt update
sudo apt install -y postgresql-client rclone

cd ~/CRM-APP
git pull
chmod +x backend/scripts/scheduled-backup.sh
chmod +x backend/scripts/install-backup-cron.sh
```

### Configurare Google Drive (rclone)

```bash
rclone config
```

1. `n` → nuovo remote  
2. Nome: **`gdrive`** (o cambia `RCLONE_REMOTE` nel `.env`)  
3. Tipo storage: **Google Drive** (di solito numero `18` o `drive`)  
4. Segui il link nel browser per autorizzare l’account Google  
5. Cartella root: Invio (default)

Test:

```bash
rclone lsd gdrive:
mkdir -p ~/CRM-APP/backups
echo test > ~/CRM-APP/backups/test.txt
rclone copy ~/CRM-APP/backups gdrive:CRM-Backups
```

### Variabili opzionali in `backend/.env`

```env
BACKUP_DIR=../backups
BACKUP_RETENTION_DAYS=30
RCLONE_REMOTE=gdrive
RCLONE_PATH=CRM-Backups
```

### Attivare cron (ogni 5 giorni alle 03:00)

```bash
cd ~/CRM-APP/backend/scripts
./install-backup-cron.sh
```

Giorni di esecuzione: **1, 6, 11, 16, 21, 26** di ogni mese.

### Backup manuale subito

```bash
cd ~/CRM-APP/backend/scripts
./scheduled-backup.sh
```

Log: `~/CRM-APP/backups/logs/`

Oppure dall’app: **Impostazioni → Esegui backup ora**

### Verifica cron

```bash
crontab -l
ls -la ~/CRM-APP/backups/
rclone ls gdrive:CRM-Backups
```

---

## Riepilogo comandi Mint

```bash
# Dopo git pull con questo aggiornamento
cd ~/CRM-APP/backend
npm ci && npm run build
pm2 restart crm-api --update-env

# Gmail: modifica .env oppure usa Impostazioni nell’app

# Backup + Drive + cron
sudo apt install -y rclone
rclone config   # una volta
./scripts/scheduled-backup.sh
./scripts/install-backup-cron.sh
```
