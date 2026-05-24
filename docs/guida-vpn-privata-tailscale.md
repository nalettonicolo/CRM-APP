# VPN privata con Tailscale — accesso al Mint da fuori casa

Questa guida serve per **amministrare il server** (SSH, deploy, `pm2`, database) quando non sei sulla rete di casa (`192.168.x.x`).

> **Non confondere con Tailscale Funnel**  
> - **Funnel** = espone l’**API CRM** su Internet (`https://….ts.net`) → per Netlify e utenti del gestionale. Guida: [`guida-tailscale-funnel.md`](./guida-tailscale-funnel.md)  
> - **VPN (tailnet)** = rete privata tra **i tuoi** dispositivi → per SSH e manutenzione

---

## Cosa ottieni

| Da casa (LAN) | Da fuori (4G, ufficio, viaggio) |
|---------------|----------------------------------|
| `ssh nicolo@192.168.1.53` | `ssh nicolo@100.x.x.x` oppure `ssh nicolo@nome-mint` |
| Stessa rete Wi‑Fi del Mint | Stesso account Tailscale su PC/telefono |

Non serve aprire la porta **22** sul router (più sicuro).

---

## Architettura

```text
┌─────────────┐     tailnet (crittografata)     ┌─────────────┐
│  Tuo PC /   │ ◄────────────────────────────►│  Mint CRM   │
│  telefono   │   IP 100.x.x.x (privato)      │  192.168…   │
└─────────────┘                                 └─────────────┘
        │                                               │
        │  HTTPS pubblico (solo API, Funnel)            │
        └──────────► https://….ts.net/api/... ◄─────────┘
                              ▲
                    utenti → Netlify → API
```

---

## Parte 1 — Account Tailscale (una tantum)

1. Crea account su [https://login.tailscale.com/start](https://login.tailscale.com/start) (piano **Personal** gratuito).
2. **Admin console** → [DNS](https://login.tailscale.com/admin/dns) → attiva **MagicDNS** (consigliato: nomi tipo `mint-crm` invece di ricordare `100.x.x.x`).
3. Se usi anche **Funnel** per l’API: [Access controls](https://login.tailscale.com/admin/acls) → **Funnel** nella policy (vedi guida Funnel).

---

## Parte 2 — Mint (server Linux)

Collegati in locale (monitor/tastiera o SSH da casa):

```bash
# Installazione (se Tailscale non c’è)
curl -fsSL https://tailscale.com/install.sh | sh

# Collega il Mint al tuo tailnet
sudo tailscale up
```

1. Apri nel browser il link che compare nel terminale.  
2. Autorizza il device (es. nome **ServerCasaNaletto** o `mint-crm`).

Verifica:

```bash
tailscale status
# Annota: IP Tailscale (100.x.x.x) e nome DNS (es. servercasanaletto)
```

### SSH sul Mint

Assicurati che il servizio SSH sia attivo:

```bash
sudo systemctl enable ssh
sudo systemctl start ssh
sudo systemctl status ssh
```

Opzionale — accesso SSH via Tailscale SSH (senza chiavi classiche, solo account Tailscale):

```bash
# Sul Mint, una tantum
sudo tailscale set --ssh
```

Poi da un altro device con Tailscale: `ssh nicolo@servercasanaletto` (nome da `tailscale status`).

---

## Parte 3 — PC Windows (fuori casa)

1. Scarica Tailscale: [https://tailscale.com/download/windows](https://tailscale.com/download/windows)  
2. Installa e accedi con **lo stesso account** del Mint.  
3. Icona Tailscale nella tray → **Connected**.

### SSH da PowerShell

```powershell
# Sostituisci con IP o nome da "tailscale status" sul Mint
ssh nicolo@100.x.x.x

# oppure, con MagicDNS:
ssh nicolo@ServerCasaNaletto
```

### Deploy CRM da remoto

```powershell
cd "D:\CRM APP"
$env:MINT_SSH_HOST = "nicolo@100.x.x.x"   # IP Tailscale, NON 192.168.1.53
.\scripts\deploy-mint-remoto.ps1
```

Oppure, già dentro SSH sul Mint:

```bash
cd ~/CRM-APP
git pull origin main
./backend/scripts/deploy-completo-mint.sh
```

---

## Parte 4 — Telefono / tablet

- **iOS / Android:** app Tailscale dallo store → stesso login.  
- Non serve SSH sul telefono per usare il CRM: apri **https://nicoloservice.netlify.app**.  
- SSH da mobile (opzionale): app come Termius + Tailscale attivo in background.

---

## Parte 5 — Verifica connessione

Sul **PC con Tailscale**:

```powershell
# Ping all’IP Tailscale del Mint (non 192.168.1.53)
ping 100.x.x.x

ssh nicolo@100.x.x.x "pm2 list; curl -sf http://127.0.0.1:4100/api/health"
```

Sul **Mint**:

```bash
tailscale status
curl -sf http://127.0.0.1:4100/api/health
```

---

## Dopo riavvio del Mint

Tailscale di solito riparte da solo. Controlla:

```bash
tailscale status
sudo systemctl status tailscaled
pm2 list
```

Se non è connesso:

```bash
sudo tailscale up
```

**Funnel** (API pubblica) è separato: `tailscale funnel status` — vedi [`guida-tailscale-funnel.md`](./guida-tailscale-funnel.md).

---

## Risoluzione problemi

| Problema | Cosa fare |
|----------|-----------|
| `ssh 192.168.1.53` timeout da fuori casa | Normale: usa IP **100.x.x.x** con Tailscale attivo su entrambi i device |
| Device Mint “offline” in Tailscale | Mint acceso? `sudo systemctl start tailscaled` |
| SSH rifiutato | `sudo systemctl start ssh`; utente `nicolo` esiste |
| Ping ok ma SSH no | Firewall locale: `sudo ufw allow OpenSSH` (se usi ufw) |
| CRM ok ma deploy fallisce | Sei sul tailnet? `git pull` sul Mint, poi `deploy-completo-mint.sh` |
| Confusione API vs SSH | API pubblica = URL `.ts.net` (Funnel). SSH = solo VPN, non passa da Netlify |

---

## Sicurezza (buone pratiche)

- Non esporre **PostgreSQL (5432)** su Internet; resta su LAN o solo localhost sul Mint.  
- Preferire **Tailscale** al port forwarding del router (porta 22).  
- Chiavi SSH o `tailscale ssh`; evita password debole su `nicolo`.  
- Token e segreti solo in `backend/.env` sul Mint (mai su GitHub).

---

## Riferimenti nel progetto

| Argomento | File |
|-----------|------|
| API pubblica (Funnel) | [`guida-tailscale-funnel.md`](./guida-tailscale-funnel.md) |
| Deploy completo Mint | [`COSA-FARE.md`](./COSA-FARE.md) |
| Deploy da Windows | `scripts/deploy-mint-remoto.ps1` |
| URL produzione | [`riferimenti-produzione.md`](./riferimenti-produzione.md) |
| Documentazione indice | [`README.md`](./README.md) |

Documentazione ufficiale Tailscale: [https://tailscale.com/kb](https://tailscale.com/kb)
