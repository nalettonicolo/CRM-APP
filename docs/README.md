# Documentazione CRM — indice

## Guide principali (setup attuale: Netlify + Mint + Tailscale)

| Guida | Quando usarla |
|-------|----------------|
| [`COSA-FARE.md`](./COSA-FARE.md) | Checklist operativa: push Git, deploy Mint, primo avvio |
| [`andare-online-ora.md`](./andare-online-ora.md) | Mettere online in fretta |
| [`guida-vpn-privata-tailscale.md`](./guida-vpn-privata-tailscale.md) | **SSH e admin Mint da fuori casa** (VPN privata) |
| [`guida-tailscale-funnel.md`](./guida-tailscale-funnel.md) | API pubblica HTTPS (URL `.ts.net` fisso) |
| [`netlify-guida-completa.md`](./netlify-guida-completa.md) | Frontend su Netlify |
| [`guida-email-smtp-completa.md`](./guida-email-smtp-completa.md) | Gmail SMTP, email, backup Drive |
| [`riferimenti-produzione.md`](./riferimenti-produzione.md) | URL pubblici (senza segreti) |

## Guide alternative / emergenza

| Guida | Nota |
|-------|------|
| [`guida-api-stabile-senza-dominio.md`](./guida-api-stabile-senza-dominio.md) | Confronto tunnel (Tailscale vs Cloudflare) |
| [`ripristino-pm2-tunnel-1033.md`](./ripristino-pm2-tunnel-1033.md) | Solo se usi ancora tunnel Cloudflare veloce |
| [`guida-tunnel-permanente-pm2.md`](./guida-tunnel-permanente-pm2.md) | Cloudflare tunnel nominato (legacy) |
| [`guida-tunnel-da-sito-cloudflare.md`](./guida-tunnel-da-sito-cloudflare.md) | Tunnel da pannello Cloudflare |
| [`guida-deploy-autonomo-mint-dominio.md`](./guida-deploy-autonomo-mint-dominio.md) | Mint + dominio proprio, senza Netlify |
| [`deploy-production.md`](./deploy-production.md) | Indice deploy + variabili |

File locale (gitignored): `RIFERIMENTI-PRODUZIONE.local.md` nella root del repo — token e note private.
