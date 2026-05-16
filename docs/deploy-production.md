# Deploy produzione — Netlify + API su VPS + GitHub

Guida Netlify passo-passo (monorepo, GitHub, variabili, troubleshooting): **[`netlify-guida-completa.md`](netlify-guida-completa.md)**.

## 1. Repository GitHub

Sul PC (PowerShell):

```powershell
cd "d:\CRM APP"
git init
git branch -M main
git add .
git commit -m "Initial commit: NexusCRM monorepo"
```

Su GitHub: **New repository** → senza README/licenza → poi:

```powershell
git remote add origin https://github.com/TUO_UTENTE/TUO_REPO.git
git push -u origin main
```

Da questo momento puoi usare branch, PR e Actions per il controllo delle modifiche.

---

## 2. Variabili Netlify (frontend)

Nel sito Netlify → **Site configuration → Environment variables**:

| Chiave | Valore esempio |
|--------|----------------|
| `NEXT_PUBLIC_API_URL` | `https://api.tuo-dominio.it` |
| `NEXT_PUBLIC_APP_NAME` | `Nicolò Service` |

Regole:

- Nessuno **slash finale** su `NEXT_PUBLIC_API_URL`.
- **HTTPS** se l’API è esposta in TLS.

**Impostazioni build** (site): Base directory vuota, **Package directory** `frontend`, comando da root — vedi [`netlify-guida-completa.md`](netlify-guida-completa.md).

---

## 3. Server API — `.env` produzione

Copia da `backend/.env.production.example` sul VPS e personalizza:

```env
NODE_ENV=production
PORT=4000

API_URL=https://api.tuo-dominio.it
FRONTEND_URL=https://tuo-sito.netlify.app

TRUST_CROSS_SITE_COOKIES=true

DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
```

- **`FRONTEND_URL`**: dominio Netlify principale (HTTPS).
- **`TRUST_CROSS_SITE_COOKIES=true`**: obbligatorio se frontend Netlify e API sono su **domini diversi** (cookie refresh cross-site); l’API deve essere servita su **HTTPS**.
- **`FRONTEND_URLS`** (opzionale): lista separata da virgole per deploy preview manuali.
- **`ALLOW_NETLIFY_PREVIEWS=true`** (opzionale): consente tutti gli URL `*.netlify.app` per le preview.

Riavvia il processo Node / Docker dopo ogni modifica alle variabili.

---

## 4. Checklist finale

- [ ] DNS e certificati validi per API e Netlify  
- [ ] Postgres raggiungibile **solo** dal VPS dell’API  
- [ ] JWT segreti lunghi e diversi da sviluppo  
- [ ] Password utenti demo cambiate  
- [ ] SMTP configurato per email reali  

---

## 5. CI GitHub Actions

Workflow `.github/workflows/ci.yml`: su ogni push/PR esegue build frontend e backend senza database.
