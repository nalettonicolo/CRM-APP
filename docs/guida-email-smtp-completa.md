# Guida completa — Email Gmail (SMTP), notifiche e deploy Mint

Questa guida risolve l’invio email del CRM (test in Impostazioni, form contatti del sito, preventivi PDF, recupero password).

**Tempo stimato:** 15–20 minuti la prima volta.

---

## Indice

1. [Cosa serve prima di iniziare](#1-cosa-serve-prima-di-iniziare)
2. [Password per le app Gmail](#2-password-per-le-app-gmail)
3. [Configurazione nell’app (consigliata)](#3-configurazione-nellapp-consigliata)
4. [Email aziendale per il form contatti](#4-email-aziendale-per-il-form-contatti)
5. [Configurazione alternativa sul Mint (.env)](#5-configurazione-alternativa-sul-mint-env)
6. [Deploy sul Mint dopo aggiornamenti](#6-deploy-sul-mint-dopo-aggiornamenti)
7. [Verifica che tutto funzioni](#7-verifica-che-tutto-funzioni)
8. [Quali email invia il sistema](#8-quali-email-invia-il-sistema)
9. [Risoluzione problemi](#9-risoluzione-problemi)
10. [Checklist finale](#10-checklist-finale)

---

## 1. Cosa serve prima di iniziare

| Requisito | Dettaglio |
|-----------|-----------|
| Account Google | Gmail che userai per inviare (es. `tuaemail@gmail.com`) |
| Verifica in 2 passaggi | **Obbligatoria** per creare password per le app |
| Accesso admin CRM | Login su Netlify → Area riservata |
| API online | Mint acceso, `crm-api` attivo in PM2, tunnel Cloudflare attivo |
| Ultimo codice deployato | Vedi [sezione 6](#6-deploy-sul-mint-dopo-aggiornamenti) |

Senza password per le app, Gmail **rifiuta** l’SMTP anche se username e password “sembrano” corretti.

---

## 2. Password per le app Gmail

### Passo 2.1 — Attiva la verifica in 2 passaggi (se non l’hai già)

1. Apri https://myaccount.google.com/security  
2. Sezione **Verifica in due passaggi** → attivala e segui la procedura Google.

### Passo 2.2 — Crea la password per le app

1. Apri https://myaccount.google.com/apppasswords  
   - Se non vedi la pagina, la 2FA non è attiva: torna al passo 2.1.  
2. **Seleziona app:** scegli *Altro (nome personalizzato)*.  
3. Nome suggerito: `CRM Nicolò Service`.  
4. Clicca **Genera**.  
5. Google mostra **16 caratteri**, spesso in gruppi da 4 (es. `abcd efgh ijkl mnop`).

### Passo 2.3 — Come incollarla nel CRM

- Puoi incollarla **con o senza spazi**: il server rimuove gli spazi automaticamente.  
- **Non** usare la password con cui entri su gmail.com.  
- Conserva la password in un posto sicuro; se la perdi, generane una nuova e aggiorna SMTP.

---

## 3. Configurazione nell’app (consigliata)

I valori salvati da **Impostazioni** sono memorizzati nel database e hanno **priorità** sul file `.env` del Mint.

### Passo 3.1 — Apri Impostazioni

1. Vai su https://nicoloservice.netlify.app (o il tuo dominio Netlify).  
2. **Area riservata** → login admin.  
3. Menu laterale → **Impostazioni** (in basso, sezione amministrazione).

### Passo 3.2 — Compila la sezione «Email Gmail (SMTP)»

Scorri fino alla card **Email Gmail (SMTP)** e inserisci **esattamente**:

| Campo nell’app | Valore per Gmail |
|----------------|------------------|
| Host | `smtp.gmail.com` |
| Porta | `587` |
| Email Gmail (utente) | La tua email completa, es. `tuaemail@gmail.com` |
| Password per le app | I 16 caratteri generati al passo 2 |
| Email mittente | **Stessa** email Gmail dell’utente |
| Nome mittente | `Nicolò Service` (o il nome che vuoi vedere in posta in arrivo) |

**Nota sulla porta 587:** non serve SSL “diretto” sulla porta 465; con 587 il sistema usa STARTTLS (comportamento standard Gmail).

### Passo 3.3 — Salva

1. Clicca **Salva SMTP**.  
2. Attendi il messaggio di conferma in alto (banner verde / “Salvato”).  
3. Se compare errore di rete, controlla che l’API sia raggiungibile (tunnel + `NEXT_PUBLIC_API_URL` su Netlify).

### Passo 3.4 — Email di test

1. Nella stessa card, sotto **Prova invio**, inserisci **la tua email** (può essere la stessa Gmail o un’altra casella).  
2. Clicca **Invia email di test**.  
3. Esito atteso: messaggio tipo *«Email inviata»* e ricezione entro 1–2 minuti (controlla anche **Spam**).

Se il test **fallisce**, leggi il messaggio rosso in banner: indica connessione SMTP o credenziali errate → [sezione 9](#9-risoluzione-problemi).

---

## 4. Email aziendale per il form contatti

Il sito pubblico (homepage → form **Contatti e preventivi**) invia una notifica alla casella configurata così:

**Priorità destinatario**

1. **Email** in Impostazioni → **Contatti in home (footer)**  
2. Variabile `NOTIFY_EMAIL` nel `.env` del Mint (opzionale)  
3. **Email mittente** SMTP (`SMTP_FROM`)  
4. Email admin (`ADMIN_EMAIL`)

### Passo 4.1 — Imposta l’email aziendale

1. **Impostazioni** → card **Contatti in home (footer)**.  
2. Campo **Email** → es. `info@tuodominio.it` o la Gmail che controlli ogni giorno.  
3. Compila anche nome, telefono, indirizzo se vuoi che compaiano nel footer del sito.  
4. Clicca **Salva contatti**.

### Passo 4.2 — Prova dal sito pubblico

1. Apri la homepage (non loggato).  
2. Sezione **Contatti e preventivi** → compila e invia.  
3. Dovresti ricevere l’email di notifica sulla casella del passo 4.1.  
4. La richiesta viene sempre salvata in **Richieste** (menu admin), anche se l’email fallisce.

Se il form dice *«Richiesta inviata»* ma **non** arriva email, controlla SMTP (sezione 3) e che l’email aziendale sia salvata.

---

## 5. Configurazione alternativa sul Mint (.env)

Utile se preferisci non salvare la password nel database, o per il primo avvio prima di aprire Impostazioni.

### Passo 5.1 — Modifica il file sul server

```bash
ssh nicolo@192.168.1.53
nano ~/CRM-APP/backend/.env
```

### Passo 5.2 — Blocco SMTP (esempio Gmail)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tuaemail@gmail.com
SMTP_PASS=abcdefghijklmnop
SMTP_FROM=tuaemail@gmail.com
SMTP_FROM_NAME=Nicolò Service

# Opzionale: notifiche form se diversa da SMTP_FROM
# NOTIFY_EMAIL=info@tuodominio.it
```

- `SMTP_PASS`: 16 caratteri **senza spazi** o con spazi (entrambi ok dopo il deploy recente).  
- Non committare mai questo file su GitHub (è già in `.gitignore`).

### Passo 5.3 — Riavvia l’API

```bash
pm2 restart crm-api --update-env
```

### Priorità .env vs Impostazioni

| Situazione | Cosa usa il server |
|----------|-------------------|
| Hai salvato SMTP in **Impostazioni** | Valori nel **database** |
| Impostazioni SMTP vuote/incomplete | Valori nel **`.env`** |
| Dopo **Salva SMTP** in app | Database (ignora pass vecchia nel .env per user/pass) |

Se qualcosa non torna: salva di nuovo da Impostazioni oppure svuota la chiave `smtp` nel DB e usa solo `.env`.

---

## 6. Deploy sul Mint dopo aggiornamenti

Dopo un `git push` su GitHub, il **frontend** si aggiorna su Netlify da solo. L’**API** sul Mint va aggiornata manualmente (o con GitHub Actions se hai configurato i secret `MINT_*`).

### Comandi completi (consigliati)

```bash
ssh nicolo@192.168.1.53

cd ~/CRM-APP
git pull origin main

cd backend
npx prisma db push
npm ci
npm run build

pm2 restart crm-api --update-env
pm2 restart crm-tunnel --update-env 2>/dev/null || true
pm2 save

# Verifica API locale
curl -s http://127.0.0.1:4100/api/health
```

Risposta attesa: `{"status":"ok",...}` (porta **4100** se così è nel tuo `.env`; altrimenti prova `4000`).

### Script rapido

```bash
bash ~/CRM-APP/backend/scripts/upgrade-mint.sh
```

### Verifica tunnel (da qualsiasi PC)

Sostituisci con il tuo URL Cloudflare in `API_URL`:

```bash
curl -s https://TUO-TUNNEL.trycloudflare.com/api/health
```

Su **Netlify** → Environment variables → `NEXT_PUBLIC_API_URL` deve essere **identico** a `API_URL` sul Mint (stesso URL HTTPS, senza `/` finale).

---

## 7. Verifica che tutto funzioni

### Test A — Health API

```bash
curl -s http://127.0.0.1:4100/api/health
curl -s https://TUO-TUNNEL.trycloudflare.com/api/health
```

### Test B — Email da Impostazioni

1. Impostazioni → **Invia email di test** → casella tua.  
2. Ricevuta OK.

### Test C — Form sito

1. Homepage → form contatto → invio.  
2. Email su casella **Contatti in home**.  
3. Voce in admin → **Richieste**.

### Test D — Preventivo (opzionale)

1. Preventivo con cliente che ha email.  
2. Azione **Invia email** / PDF.  
3. Cliente riceve allegato.

### Test E — Log server (se fallisce)

```bash
pm2 logs crm-api --lines 50
```

Cerca righe `[Email]` o `Invio email fallito`.

---

## 8. Quali email invia il sistema

| Evento | Destinatario | Mittente |
|--------|--------------|----------|
| **Email di test** (Impostazioni) | Indirizzo che inserisci nel test | `SMTP_FROM` / nome configurato |
| **Form contatti** (sito pubblico) | Email aziendale (footer) | Gmail SMTP |
| **Preventivo PDF** | Email del cliente sul preventivo | Gmail SMTP |
| **Recupero password** | Email utente che richiede reset | Gmail SMTP |

Se SMTP non è configurato, le richieste vengono comunque **salvate** (lead/preventivi), ma l’email **non** parte e nei log compare `[Email] SMTP non configurato`.

---

## 9. Risoluzione problemi

### «SMTP non configurato»

**Causa:** mancano host, utente, password app o mittente.

**Soluzione:** compila tutti i campi in Impostazioni → **Salva SMTP**, oppure completa il `.env` e `pm2 restart crm-api --update-env`.

---

### «Connessione SMTP fallita» / timeout

**Cause comuni**

- Mint senza internet  
- Host errato (deve essere `smtp.gmail.com`)  
- Porta sbagliata (usa `587`, non `465` con le impostazioni attuali)  
- Firewall che blocca la porta 587 in uscita  

**Soluzione:** dal Mint prova:

```bash
nc -zv smtp.gmail.com 587
```

---

### «Invalid login» / «Username and Password not accepted»

**Cause comuni**

- Password Gmail normale invece della **password per le app**  
- 2FA non attiva  
- Email utente diversa da quella che ha generato la password app  
- Password app revocata da Google  

**Soluzione:** nuova password su https://myaccount.google.com/apppasswords → aggiorna in Impostazioni → Salva SMTP → nuovo test.

---

### Test OK ma form contatti senza email

1. **Impostazioni → Contatti in home** → campo Email compilato → **Salva contatti**.  
2. Controlla spam.  
3. `pm2 logs crm-api` durante l’invio del form.

---

### Test OK in locale Mint ma app Netlify non invia

1. `NEXT_PUBLIC_API_URL` su Netlify = URL tunnel attuale.  
2. Tunnel cloudflared in esecuzione (`pm2 list` → `crm-tunnel` online).  
3. Dopo cambio tunnel, aggiorna `API_URL` nel `.env` Mint e ridploy frontend se URL cambia.

---

### Ho salvato SMTP in app ma usa ancora valori vecchi

1. **Salva SMTP** di nuovo dall’app.  
2. `pm2 restart crm-api --update-env` (ricarica env e cache SMTP ~30 secondi).  
3. Se hai modificato solo `.env` ma SMTP è salvato in DB, il **database vince**: aggiorna da Impostazioni o allinea i valori.

---

### Messaggio: «Email simulata in log server»

SMTP non attivo: manca configurazione completa. Non è un invio reale.

---

## 10. Checklist finale

Stampa o segna questa lista:

- [ ] Verifica in 2 passaggi Google attiva  
- [ ] Password per le app creata (16 caratteri)  
- [ ] Impostazioni → SMTP compilato (host, 587, user, pass, from, nome)  
- [ ] **Salva SMTP** eseguito  
- [ ] **Invia email di test** → ricevuta  
- [ ] Impostazioni → **Contatti in home** → email aziendale → **Salva contatti**  
- [ ] Form homepage testato → email ricevuta  
- [ ] Mint: `git pull` + `npx prisma db push` + `npm run build` + `pm2 restart crm-api --update-env`  
- [ ] `curl` health OK (locale e tunnel)  
- [ ] Netlify: `NEXT_PUBLIC_API_URL` allineato a `API_URL`  

---

## Riferimenti rapidi

| Risorsa | Link / percorso |
|---------|----------------|
| Password per le app | https://myaccount.google.com/apppasswords |
| Sicurezza Google | https://myaccount.google.com/security |
| Template variabili `.env` | `backend/.env.example` |
| Backup (questa guida, sezione backup) | sotto in questo file |
| Deploy Mint + Netlify | `docs/COSA-FARE.md` |

---

*Ultimo aggiornamento: allineato al CRM con notifiche su email aziendale, normalizzazione password Gmail e messaggi di errore SMTP in Impostazioni.*
