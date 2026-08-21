# Porte fisse — due CRM sullo stesso Mint / stesso PC
#
# | App              | Processo PM2 | Porta locale | URL pubblico Funnel                          |
# |------------------|--------------|--------------|----------------------------------------------|
# | Nicolò Service   | crm-api      | 4100         | https://….ts.net          (HTTPS 443)        |
# | Nicolò-3D/Stampa | n3d-api      | 4101         | https://….ts.net:8443     (HTTPS 8443)       |
#
# Frontend locale: Nicolò Service → :3000 | Stampa 3D → :3100
#
# NON usare la stessa PORT per entrambi. Non fare "tailscale funnel reset"
# senza poi ripristinare entrambe le regole.

CRM_APP_PORT=4100
N3D_API_PORT=4101
N3D_FUNNEL_HTTPS=8443
