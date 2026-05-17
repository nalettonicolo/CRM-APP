# Creare il tunnel Cloudflare dal sito (senza comandi difficili)

Questa guida è per chi **non riesce** con `cloudflared tunnel login` / `config.yml` da terminale.  
Creerai tutto dal **pannello Cloudflare** nel browser; sul Mint incollerai **solo 2–3 comandi** copiati dal sito o da qui.

**Risultato:** un URL **fisso** tipo `https://api.tuodominio.it` o `https://crm-api.tuodominio.it` che punta alla tua API su `http://127.0.0.1:4100`.

---

## Perché Cloudflare non accetta `nicoloservice.netlify.app`

Nel passo **Public Hostname** (sottodominio + dominio) Cloudflare mostra **solo domini che hai aggiunto al tuo account** (Siti web → dominio tuo con DNS su Cloudflare).

| URL | Ruolo | Tunnel Cloudflare |
|-----|--------|-------------------|
| `https://nicoloservice.netlify.app` | **Frontend** (Next.js su Netlify) | **No** — `netlify.app` è di Netlify, non tuo |
| `https://api.tuodominio.it` | **API** (Express sul Mint) | **Sì** — dominio che controlli su Cloudflare |
| `https://qualcosa.trycloudflare.com` | API temporanea | **Sì** (tunnel veloce da terminale, URL che cambia) |

**Non è un bug:** non puoi mettere `netlify.app` come dominio del tunnel perché non gestisci quel DNS.

**Architettura corretta (due indirizzi diversi):**

```text
Utente → nicoloservice.netlify.app     (sito, Netlify)
       → api.tuodominio.it              (API, Cloudflare Tunnel → Mint:4100)
```

Il sito **resta su Netlify**. Sul Mint e su Netlify allinei solo l’URL dell’API (`API_URL` / `NEXT_PUBLIC_API_URL`), non il dominio del frontend.

### Cosa fare se non hai ancora un dominio

**A) Tunnel veloce (subito, senza dominio)** — vedi [`ripristino-pm2-tunnel-1033.md`](./ripristino-pm2-tunnel-1033.md): ottieni un URL `https://xxx.trycloudflare.com`, lo metti in `API_URL` e `NEXT_PUBLIC_API_URL`. L’URL **cambia** se ricrei il tunnel.

**B) Dominio economico (consigliato per produzione)** — registra un dominio (Aruba, Register, Cloudflare Registrar, ecc.), aggiungilo a Cloudflare, crea hostname `api` → `localhost:4100`. Il frontend può restare `nicoloservice.netlify.app`; opzionale in futuro: dominio personalizzato anche su Netlify (`www.tuodominio.it`).

**C) Stesso dominio, due usi** — es. `www.tuodominio.it` su Netlify (CNAME in Netlify) e `api.tuodominio.it` sul tunnel (record gestito da Cloudflare). Serve un dominio tuo, non `netlify.app`.

---

## Cosa ti serve

| Cosa | Dettaglio |
|------|-----------|
| Account Cloudflare | Gratuito: [dash.cloudflare.com](https://dash.cloudflare.com) |
| Un dominio su Cloudflare | Es. `tuosito.it` — devi poter aggiungere record DNS (anche dominio economico) |
| Mint acceso | Il PC dove gira PostgreSQL e il CRM |
| API locale | Dopo questa guida: `crm-api` in PM2 sulla porta **4100** |

**Nota:** il tunnel “da sito” collega un **hostname** (dominio) al Mint.  
Senza nessun dominio su Cloudflare, il pannello non può creare un indirizzo pubblico fisso; in quel caso usa il tunnel veloce da [`ripristino-pm2-tunnel-1033.md`](./ripristino-pm2-tunnel-1033.md) oppure registra/aggiungi un dominio su Cloudflare (anche solo per l’API).

---

## Parte 1 — Account e Zero Trust (solo browser)

### Passo 1.1 — Accedi a Cloudflare

1. Apri [https://dash.cloudflare.com](https://dash.cloudflare.com)  
2. Accedi con la tua email Google (es. quella Gmail del CRM).

### Passo 1.2 — Aggiungi il tuo dominio (se non c’è già)

1. Menu a sinistra → **Siti web** (o **Websites**) → **Aggiungi un sito**  
2. Inserisci il dominio (es. `nicoloservice.it` o un dominio che possiedi).  
3. Piano **Free** → Continua.  
4. Cloudflare ti mostra i **nameserver** da impostare presso il registrar (Aruba, Register, ecc.).  
5. Quando lo stato del sito diventa **Attivo**, il dominio è pronto.

Se il dominio è già su Cloudflare, salta questo passo.

### Passo 1.3 — Apri Zero Trust

1. Nel menu Cloudflare cerca **Zero Trust** (o apri [https://one.dash.cloudflare.com](https://one.dash.cloudflare.com))  
2. La prima volta ti chiede di creare un **team** (nome libero, es. `nicolo-service`) — piano **Free** va bene.  
3. Seleziona il team creato.

---

## Parte 2 — Crea il tunnel dal sito

### Passo 2.1 — Vai ai tunnel

1. Menu sinistro: **Reti** (Networks) → **Connettori** (Connectors)  
2. Scheda / voce: **Cloudflare Tunnel** (a volte **Tunnels**)  
3. Pulsante **Crea un tunnel** (Create a tunnel)

### Passo 2.2 — Tipo e nome

1. Scegli **Cloudflared** (connettore installato sul server, il tuo Mint).  
2. Nome tunnel: `crm-nicolo-service` (o come preferisci).  
3. **Salva tunnel** / **Save tunnel**.

### Passo 2.3 — Scegli ambiente

1. Ambiente: **Debian / Ubuntu / Linux** (il Mint è Linux).  
2. Non chiudere la pagina: ti darà un **comando di installazione** con un token lungo che inizia con `eyJ...`.

---

## Parte 3 — Hostname pubblico (dal sito, senza DNS a mano)

Dopo aver creato il tunnel, il wizard chiede di pubblicare un’applicazione (oppure vai su **Route pubbliche** / **Public Hostname** → **Aggiungi**).

Compila così:

| Campo | Valore |
|--------|--------|
| **Sottodominio** (Subdomain) | `api` (oppure `crm-api`) |
| **Dominio** (Domain) | Il tuo dominio su Cloudflare, es. `tuodominio.it` |
| **Tipo servizio** | `HTTP` |
| **URL** | `localhost:4100` oppure `127.0.0.1:4100` |

- **Non** mettere `https://` nel URL servizio, solo host e porta.  
- La porta **4100** deve essere quella in `~/CRM-APP/backend/.env` (`PORT=4100`).

Salva / **Save hostname**.

### Il tuo URL API fisso

Sarà qualcosa come:

`https://api.tuodominio.it`

(scrivilo su un foglio: servirà per Mint e Netlify.)

### Passo 2.4 — Stato tunnel nel pannello

Torna su **Reti → Connettori → Cloudflare Tunnel** → clic sul tunnel `crm-nicolo-service`.

- **Connector**: all’inizio può essere **Inattivo** (Inactive) finché non avvii `cloudflared` sul Mint.  
- **Route pubbliche**: deve comparire la riga con `api.tuodominio.it` → `http://127.0.0.1:4100`.

Puoi aggiungere o modificare hostname in qualsiasi momento da **Edit tunnel** senza rifare il login da terminale.

---

## Parte 4 — Copia il token (dal sito)

Sempre nella pagina del tunnel, sezione **Installa connettore** / **Install connector**:

Vedrai un comando simile a uno di questi:

```bash
sudo cloudflared service install eyJhIjoiXXXXXXXX...
```

oppure:

```bash
cloudflared tunnel run --token eyJhIjoiXXXXXXXX...
```

**Cosa ti serve:** solo la stringa **`eyJhIjoi...`** (tutto il token, molto lunga).

1. Selezionala e **copiala** in un file di testo sul PC (Blocco note).  
2. **Non** condividerla pubblicamente (è la chiave del tunnel).

> **Consiglio:** non usare `sudo cloudflared service install` se vuoi gestire tutto con **PM2** insieme a `crm-api`. Usa solo il **token** con il comando PM2 del passo 5.2.

---

## Parte 5 — Sul Mint: solo comandi da incollare

Apri il **terminale sul Mint** (icona nera sul PC server, utente `nicolo`).  
**Non** serve `ssh` se sei già sul Mint.

### Passo 5.1 — Installa cloudflared (una tantum)

Se non l’hai già:

```bash
sudo apt update
sudo apt install -y cloudflared
cloudflared --version
```

### Passo 5.2 — Avvia prima l’API CRM

```bash
cd ~/CRM-APP/backend
npm ci
npm run build

pm2 delete crm-api 2>/dev/null || true
pm2 start dist/index.js --name crm-api --cwd ~/CRM-APP/backend --update-env

curl -s http://127.0.0.1:4100/api/health
```

Risposta attesa: `{"status":"ok",...}`

### Passo 5.3 — Avvia il tunnel con il token (copiato dal sito)

Sostituisci `INCOLLA_QUI_IL_TOKEN` con il token `eyJ...` copiato dal pannello Cloudflare:

```bash
pm2 delete crm-tunnel 2>/dev/null || true
pm2 start cloudflared --name crm-tunnel -- tunnel run --token INCOLLA_QUI_IL_TOKEN
pm2 save
pm2 list
```

Dopo 10–20 secondi, nel **sito Cloudflare** il connettore deve diventare **Healthy** / **Connesso**.

### Passo 5.4 — Script alternativo (token nel file .env)

Dopo `git pull`, puoi mettere il token in `~/CRM-APP/backend/.env`:

```env
CLOUDFLARE_TUNNEL_TOKEN=eyJ...incolla tutto il token...
```

Poi:

```bash
chmod +x ~/CRM-APP/backend/scripts/avvia-tunnel-token-pm2.sh
~/CRM-APP/backend/scripts/avvia-tunnel-token-pm2.sh
```

---

## Parte 6 — Allinea Mint e Netlify

### Sul Mint — file `.env`

```bash
nano ~/CRM-APP/backend/.env
```

Imposta (con **il tuo** hostname creato sul sito):

```env
API_URL=https://api.tuodominio.it
PORT=4100
FRONTEND_URL=https://nicoloservice.netlify.app
TRUST_CROSS_SITE_COOKIES=true
ALLOW_NETLIFY_PREVIEWS=true
```

```bash
pm2 restart crm-api --update-env
curl -s https://api.tuodominio.it/api/health
```

Deve rispondere `{"status":"ok",...}` (non pagina di errore Cloudflare).

### Su Netlify

1. [app.netlify.com](https://app.netlify.com) → sito **nicoloservice**  
2. **Site configuration → Environment variables**  
3. `NEXT_PUBLIC_API_URL` = **esattamente** lo stesso di `API_URL` (es. `https://api.tuodominio.it`, **senza** `/` finale)  
4. **Deploys → Trigger deploy → Clear cache and deploy site**

### Login

Apri https://nicoloservice.netlify.app/login — non deve più comparire *«Impossibile contattare l'API (forests-battle...)»*.

---

## Parte 7 — Avvio automatico quando accendi il Mint

```bash
pm2 startup
```

Cloudflare stampa una riga che inizia con `sudo env PATH=...` — **copiala, incollala, Invio**.

Poi:

```bash
pm2 save
```

Dopo un riavvio del Mint:

```bash
pm2 list
```

`crm-api` e `crm-tunnel` devono essere **online**. Il sito Cloudflare deve mostrare il connettore **Healthy**.

---

## Verifica dal pannello Cloudflare (solo browser)

1. **Zero Trust** → **Reti** → **Connettori** → tunnel `crm-nicolo-service`  
2. **Stato connettore:** Healthy (verde)  
3. **Route pubbliche:** `api.tuodominio.it` → `http://127.0.0.1:4100`  
4. Nel browser apri: `https://api.tuodominio.it/api/health`

---

## Risoluzione problemi

| Problema | Cosa fare |
|----------|-----------|
| Non trovo “Zero Trust” | Cerca nel menu principale Cloudflare o vai a [one.dash.cloudflare.com](https://one.dash.cloudflare.com) |
| Nessun dominio nel menu a tendina | Aggiungi il sito in **Websites** e attendi stato Attivo |
| Connettore sempre Inattivo | Sul Mint: `pm2 logs crm-tunnel` — token sbagliato o scaduto; dal sito copia di nuovo il comando install |
| Errore 1033 su vecchio trycloudflare | Stai usando un URL vecchio; usa solo `https://api.tuodominio.it` |
| Login Netlify ancora errore API | `NEXT_PUBLIC_API_URL` ≠ `API_URL` o deploy Netlify non rifatto |
| `crm-api not found` | Usa `pm2 start dist/index.js ...` non solo `restart` — vedi [`ripristino-pm2-tunnel-1033.md`](./ripristino-pm2-tunnel-1033.md) |
| Token nel comando troncato | Incolla tutto il token in una riga, senza spazi a capo |

### Rigenerare il token dal sito

1. Pannello → tunnel → **Configure** / **Modifica**  
2. Sezione connettore → **Regenerate token** (se presente) oppure elimina tunnel e ricrealo (ultima risorsa)  
3. Aggiorna il comando PM2 con il nuovo token

---

## Riepilogo: sito vs terminale

| Fatto sul **sito Cloudflare** | Fatto sul **Mint** (terminale) |
|------------------------------|--------------------------------|
| Crea tunnel `crm-nicolo-service` | `pm2 start crm-api` |
| Hostname `api.dominio.it` → porta 4100 | `pm2 start cloudflared ... --token eyJ...` |
| Copia token `eyJ...` | `API_URL` + `pm2 save` + `pm2 startup` |
| Vedi connettore Healthy | `curl https://api.dominio.it/api/health` |

---

## Altre guide

- Tunnel da terminale (config.yml): [`guida-tunnel-permanente-pm2.md`](./guida-tunnel-permanente-pm2.md)  
- Ripristino urgente PM2 vuoto: [`ripristino-pm2-tunnel-1033.md`](./ripristino-pm2-tunnel-1033.md)  
- Email Gmail: [`guida-email-smtp-completa.md`](./guida-email-smtp-completa.md)
