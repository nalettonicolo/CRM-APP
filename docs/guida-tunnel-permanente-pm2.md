# Tunnel Cloudflare permanente + PM2 + avvio automatico (Mint)

> **Preferisci creare il tunnel dal sito Cloudflare (senza `cloudflared login` da terminale)?**  
> Usa la guida dedicata: **[`guida-tunnel-da-sito-cloudflare.md`](./guida-tunnel-da-sito-cloudflare.md)** — copi solo il token `eyJ...` e un comando PM2.

Obiettivo: URL **fisso** per l’API (non cambia a ogni riavvio), tunnel sempre attivo in **PM2** (`crm-tunnel`), e tutto che **riparte da solo** quando accendi il Mint.

**Prerequisiti**

- Mint acceso e connesso a Internet  
- API CRM già in PM2 (`crm-api`) su porta **4100** (o quella nel tuo `.env`)  
- Account [Cloudflare](https://dash.cloudflare.com) gratuito  
- `cloudflared` e `pm2` installati sul Mint  

---

## Indice

1. [Installare cloudflared](#1-installare-cloudflared)  
2. [Creare il tunnel nominato](#2-creare-il-tunnel-nominato)  
3. [File di configurazione](#3-file-di-configurazione)  
4. [Hostname pubblico (scegli A o B)](#4-hostname-pubblico-scegli-a-o-b)  
5. [Avviare il tunnel con PM2](#5-avviare-il-tunnel-con-pm2)  
6. [Avvio automatico al boot (pm2 startup)](#6-avvio-automatico-al-boot-pm2-startup)  
7. [Allineare .env Mint e Netlify](#7-allineare-env-mint-e-netlify)  
8. [Verifiche](#8-verifiche)  
9. [Risoluzione problemi](#9-risoluzione-problemi)  

---

## 1. Installare cloudflared

Sul Mint:

```bash
which cloudflared || sudo apt install -y cloudflared
```

Se il pacchetto non c’è:

```bash
sudo mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared jammy main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update && sudo apt install -y cloudflared
cloudflared --version
```

---

## 2. Creare il tunnel nominato

### Passo 2.1 — Login (una tantum)

```bash
cloudflared tunnel login
```

Si apre il browser: accedi a Cloudflare e autorizza. Il certificato viene salvato in `~/.cloudflared/cert.pem`.

### Passo 2.2 — Crea tunnel

```bash
cloudflared tunnel create crm-nicolo-service
```

Annota l’**UUID** mostrato (es. `a1b2c3d4-e5f6-7890-abcd-ef1234567890`).  
Esiste anche il file `~/.cloudflared/<UUID>.json` (credenziali).

---

## 3. File di configurazione

```bash
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

Modello (copia da `docs/cloudflared-config.example.yml` nel repo):

```yaml
tunnel: crm-nicolo-service
credentials-file: /home/nicolo/.cloudflared/<UUID>.json

ingress:
  - hostname: api.tuodominio.it
    service: http://127.0.0.1:4100
  - service: http_status:404
```

- Sostituisci `<UUID>` con il valore reale.  
- `4100` = porta in `~/CRM-APP/backend/.env` (`PORT=4100`).  
- L’ultima riga `http_status:404` è **obbligatoria**.

---

## 4. Hostname pubblico (scegli A o B)

### Opzione A — Hai un dominio su Cloudflare (consigliato)

Esempio: `api.nicoloservice.it` punta al tunnel.

```bash
cloudflared tunnel route dns crm-nicolo-service api.tuodominio.it
```

URL finale API: `https://api.tuodominio.it`

### Opzione B — Senza dominio proprio (hostname Cloudflare)

1. Vai su [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) → **Networks** → **Tunnels**  
2. Seleziona il tunnel `crm-nicolo-service`  
3. **Public Hostname** → Add  
   - Subdomain: es. `crm-api` (o come preferisci)  
   - Domain: scegli un dominio gestito da Cloudflare (anche `cfargotunnel.com` se offerto)  
   - Service: `http://127.0.0.1:4100`  
4. Copia l’hostname creato (es. `crm-api-xxxx.cfargotunnel.com`) e mettilo in `config.yml` sotto `hostname:`

URL finale API: `https://quell-hostname`

---

## 5. Avviare il tunnel con PM2

### Metodo rapido (script nel repo)

Dopo `git pull` sul Mint:

```bash
chmod +x ~/CRM-APP/backend/scripts/setup-tunnel-pm2.sh
~/CRM-APP/backend/scripts/setup-tunnel-pm2.sh
```

### Metodo manuale

```bash
# Ferma eventuale tunnel temporaneo (terminale con trycloudflare)
pm2 delete crm-tunnel 2>/dev/null || true

pm2 start cloudflared --name crm-tunnel -- \
  tunnel --config /home/nicolo/.cloudflared/config.yml run

pm2 save
pm2 list
```

Deve comparire:

| Nome        | Stato   |
|------------|---------|
| `crm-api`  | online  |
| `crm-tunnel` | online |

---

## 6. Avvio automatico al boot (pm2 startup)

`pm2 save` **non basta** da solo: serve collegare PM2 a **systemd**.

### Passo 6.1 — Genera comando startup

```bash
pm2 startup
```

PM2 stampa una riga tipo:

```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u nicolo --hp /home/nicolo
```

### Passo 6.2 — Esegui quella riga (copia-incolla)

```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u nicolo --hp /home/nicolo
```

(Sostituisci `nicolo` con il tuo utente Linux se diverso.)

### Passo 6.3 — Salva di nuovo i processi

```bash
pm2 save
```

### Passo 6.4 — Test reboot (opzionale ma consigliato)

```bash
sudo reboot
```

Dopo il riavvio (da un altro PC):

```bash
ssh nicolo@192.168.1.53 "pm2 list"
```

Entrambi `crm-api` e `crm-tunnel` devono essere **online**.

---

## 7. Allineare .env Mint e Netlify

### Sul Mint

```bash
nano ~/CRM-APP/backend/.env
```

```env
API_URL=https://api.tuodominio.it
# oppure https://crm-api-xxxx.cfargotunnel.com

FRONTEND_URL=https://nicoloservice.netlify.app
PORT=4100
TRUST_CROSS_SITE_COOKIES=true
ALLOW_NETLIFY_PREVIEWS=true
```

```bash
pm2 restart crm-api --update-env
```

### Su Netlify

[app.netlify.com](https://app.netlify.com) → sito → **Environment variables**

| Chiave | Valore |
|--------|--------|
| `NEXT_PUBLIC_API_URL` | **Stesso** URL di `API_URL` (senza `/` finale) |

Ridploy del sito Netlify dopo la modifica.

---

## 8. Verifiche

### Dal Mint

```bash
curl -s http://127.0.0.1:4100/api/health
curl -s https://TUO-HOSTNAME-API/api/health
pm2 logs crm-tunnel --lines 30
```

### Da Windows / telefono

Apri nel browser:

`https://TUO-HOSTNAME-API/api/health` → `{"status":"ok",...}`

Poi login su Netlify: https://nicoloservice.netlify.app/login

---

## 9. Risoluzione problemi

| Problema | Soluzione |
|----------|-----------|
| **PM2 vuoto** / Error **1033** su trycloudflare | [`ripristino-pm2-tunnel-1033.md`](./ripristino-pm2-tunnel-1033.md) + `backend/scripts/ripristina-mint-pm2.sh` |
| `crm-tunnel` in errore | `pm2 logs crm-tunnel` — controlla UUID e `config.yml` |
| 502 / tunnel OK ma API no | `pm2 restart crm-api`; verifica porta 4100 |
| URL cambia ancora | Stai usando tunnel **quick** (`trycloudflare`); passa al tunnel **nominato** (questa guida) |
| Dopo reboot PM2 vuoto | Ripeti [sezione 6](#6-avvio-automatico-al-boot-pm2-startup) |
| Login Netlify “rete” | `NEXT_PUBLIC_API_URL` ≠ `API_URL` o tunnel spento |
| Logo/email ok solo in LAN | Tunnel non raggiungibile da Internet — verifica hostname DNS |

---

## Riepilogo comandi (copia-incolla)

```bash
# Una tantum: tunnel + config (dopo cloudflared tunnel login/create)
nano ~/.cloudflared/config.yml

# PM2 tunnel + API
~/CRM-APP/backend/scripts/setup-tunnel-pm2.sh
pm2 startup
# → esegui la riga sudo che PM2 stampa
pm2 save

# .env + restart
nano ~/CRM-APP/backend/.env   # API_URL = hostname fisso
pm2 restart crm-api --update-env
```

---

## Collegamenti

- Deploy generale Mint + Netlify: [`COSA-FARE.md`](./COSA-FARE.md)  
- Email SMTP: [`guida-email-smtp-completa.md`](./guida-email-smtp-completa.md)  
- Esempio config: [`cloudflared-config.example.yml`](./cloudflared-config.example.yml)  
