# Ripristino urgente — PM2 vuoto e errore Cloudflare 1033

## Cosa significa il tuo output

| Sintomo | Causa |
|---------|--------|
| `pm2 list` **vuoto** | Nessun processo salvato: `crm-api` e tunnel **non sono avviati** |
| `curl` tunnel → pagina Cloudflare **Error 1033** | Il tunnel `forests-battle-elements-prospect.trycloudflare.com` **non è più attivo** (tunnel quick chiuso o Mint riavviato) |
| `pm2 daemon` appena creato | PM2 era vuoto/reset — normale dopo reboot senza `pm2 startup` |

L’URL `forests-battle-elements-prospect.trycloudflare.com` **non si riattiva da solo**: serve un **nuovo** tunnel o il tunnel **permanente** in PM2.

---

## Soluzione rapida (copia-incolla sul Mint)

Sei già su `nicolo@ServerCasaNaletto` (SSH ok).

### 1. Ripristino automatico

```bash
cd ~/CRM-APP
git pull origin main
chmod +x backend/scripts/ripristina-mint-pm2.sh
./backend/scripts/ripristina-mint-pm2.sh
```

### 2. Se usi tunnel **veloce** (trycloudflare) — URL nuovo obbligatorio

```bash
pm2 logs crm-tunnel --lines 30
```

Cerca una riga tipo:

`https://qualcosa-di-nuovo.trycloudflare.com`

**Non** usare più `forests-battle-elements-prospect`.

Aggiorna sul Mint:

```bash
nano ~/CRM-APP/backend/.env
```

```env
API_URL=https://IL-NUOVO-URL.trycloudflare.com
```

```bash
pm2 restart crm-api --update-env
curl -s https://IL-NUOVO-URL.trycloudflare.com/api/health
```

Su **Netlify** → `NEXT_PUBLIC_API_URL` = **stesso** URL → **Clear cache and deploy**.

### 3. Avvio automatico al boot (da fare ora)

```bash
pm2 startup
```

Esegui la riga **`sudo env PATH=... pm2 startup systemd -u nicolo --hp /home/nicolo`** che compare, poi:

```bash
pm2 save
```

### 4. Verifica finale

```bash
pm2 list
```

Atteso:

| name | status |
|------|--------|
| crm-api | online |
| crm-tunnel | online |

```bash
curl -s http://127.0.0.1:4100/api/health
# {"status":"ok",...}

curl -s https://TUO-URL-ATTUALE/api/health
# {"status":"ok",...}   (non HTML Cloudflare)
```

---

## Ripristino manuale (se lo script fallisce)

```bash
cd ~/CRM-APP/backend
npm ci
npm run build

pm2 start dist/index.js --name crm-api --cwd ~/CRM-APP/backend --update-env
curl -s http://127.0.0.1:4100/api/health

pm2 start cloudflared --name crm-tunnel -- tunnel --url http://127.0.0.1:4100
pm2 logs crm-tunnel
pm2 save
```

---

## Tunnel permanente (consigliato — URL che non cambia)

Segui passo passo: [`guida-tunnel-permanente-pm2.md`](./guida-tunnel-permanente-pm2.md)

Dopo `~/.cloudflared/config.yml`:

```bash
pm2 delete crm-tunnel
pm2 start cloudflared --name crm-tunnel -- \
  tunnel --config /home/nicolo/.cloudflared/config.yml run
pm2 save
```

`API_URL` = hostname **fisso** (dominio o hostname Zero Trust), non trycloudflare.

---

## Errori frequenti

**`curl localhost:4100` non risponde**  
→ API non partita: `pm2 logs crm-api`, controlla `DATABASE_URL` e `PORT` in `.env`.

**Tunnel online ma 1033 su vecchio URL**  
→ Stai usando un URL **vecchio**. Leggi `pm2 logs crm-tunnel` per l’URL corrente o passa al tunnel permanente.

**Dopo reboot tutto vuoto di nuovo**  
→ Non hai completato `pm2 startup` + riga `sudo` + `pm2 save`.

---

## Ordine consigliato oggi

1. `./backend/scripts/ripristina-mint-pm2.sh`  
2. Nuovo URL tunnel → `.env` + Netlify  
3. `pm2 startup` + `sudo ...` + `pm2 save`  
4. Pianifica tunnel permanente ([guida](guida-tunnel-permanente-pm2.md))
