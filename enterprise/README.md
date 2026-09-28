# Nicolò Service — Gestionale Enterprise (parallelo)

Base di sviluppo per il gestionale **enterprise**, pensato per affiancare
`CRM-APP` (non sostituirlo): stesso spirito tecnico (Node/Express + Prisma +
PostgreSQL sul backend, Next.js + Tailwind sul frontend) ma un **codebase e
un database completamente separati**, con funzionalità stile ClickUp:
progetti/task Kanban, automazioni, chat, docs/wiki, time tracking,
whiteboard, BI/reportistica, ruoli granulari e audit trail.

**Design**: trattandosi di un gestionale/pannello admin, il frontend segue
regole minimali deliberate, non uno stile "landing page": un solo colore di
accento per elementi interattivi (brand viola — i colori verde/ambra/rosso/
ciano sono riservati alla codifica semantica di stato/priorità, mai
decorativi), raggi coerenti (`--radius: 12px` per card/bottoni/input, pill
solo per i badge), contrasto testo verificato (niente testo sotto `white/45`
di opacità sul fondo scuro), stati loading/empty/error standard
(`components/StateViews.tsx`) e nessuna animazione/gradiente decorativo
vistoso. La pagina `/projects` è l'esempio di riferimento del pattern
fetch-con-fallback + loading/empty state da replicare sulle altre liste.

> **Stato attuale**: fase "foundation" — schema dati completo, API core
> funzionanti (auth, progetti/task, time tracking, chat, docs, whiteboard,
> automazioni, report, audit), frontend con tutte le schermate già navigabili
> e visivamente rifinite. Il frontend funziona **anche senza backend/DB
> collegati**, usando dati demo (`frontend/lib/mockData.ts`) come fallback
> automatico — utile per validare l'interfaccia prima di completare
> l'integrazione end-to-end. Vedi "Roadmap" in fondo per cosa manca ancora.

## Perché un repository/codebase separato

Su richiesta esplicita: il gestionale enterprise **non modifica** in alcun
modo `backend/` e `frontend/` del CRM-APP esistente. Vive in questa cartella
`enterprise/` con package.json, schema Prisma, porte e (in futuro) database
propri, così può evolvere in autonomia. Se preferisci spostarlo in un vero
repository GitHub separato, basta copiare questa cartella in un repo vuoto:
la creazione automatica di un nuovo repo non è stata possibile in questa
sessione per un limite di permessi dell'integrazione GitHub (l'endpoint di
creazione repo ha risposto "403 Resource not accessible") — chiedimi di
riprovare, oppure crea tu un repo vuoto su GitHub e fammelo sapere: sposto
il codice lì con la history preservata.

## Stack

| Layer | Tecnologie |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, Recharts, Three.js / React Three Fiber + drei |
| Backend | Node.js, Express 5, Prisma ORM, JWT, Bcrypt |
| Database | PostgreSQL (dedicato, separato dal CRM-APP) |

## Configuratore 3D (`/configurator`)

Modulo ispirato al prodotto **Rubik** di [3D Web Lab](https://3dweblab.com/)
(configuratori prodotto 3D per l'e-commerce): scena WebGL interattiva nel
browser — ruota/zoom con il mouse, cambia colore e finitura in tempo reale —
via **React Three Fiber** (`components/ProductConfigurator.tsx`), montata
solo lato client (`next/dynamic` con `ssr:false`, il Canvas WebGL non può
girare sul server).

Utile per il ramo **Stampa3D** (non presente in questo repo — è un servizio
esterno, vedi `docs/porte-crm.md` nella root del progetto CRM-APP): far
vedere al cliente un'anteprima 3D del pezzo/prodotto, con colore/finitura
configurabili, prima di confermare un preventivo — stesso principio dei
preventivatori online di stampa 3D.

Oggi il "prodotto" è una geometria primitiva demo (`RoundedBox`). Per un
modello reale esportato da CAD/slicer:

1. **Asset pipeline** (non ancora implementata): comprimere il `.glb` con
   Draco/meshopt (es. `@gltf-transform/core`) prima di servirlo — un modello
   CAD non ottimizzato blocca il caricamento nel browser. `npx gltfjsx
   modello.glb` genera lo scheletro del componente React da un GLTF.
2. Sostituire `<ProductMesh />` in `ProductConfigurator.tsx` con
   `useGLTF("/models/prodotto.glb")` dentro una `<Suspense>` (già presente
   nel componente).
3. Se serve reggere point cloud / dataset spaziali di grandi dimensioni
   (stile "Nimbus" di 3D Web Lab) o showroom virtuali (stile "Pavilion"), è
   un modulo a parte — non coperto qui, perché richiede streaming
   progressivo dei dati e infrastruttura dedicata, non solo un componente
   React.

**Riferimenti** (per riprendere il filo in futuro):
- [3dweblab.com](https://3dweblab.com/) — sito di ispirazione; prodotti: Nimbus (data viz 3D), Pavilion (showroom virtuali), Rubik (configuratore prodotto, quello implementato qui)
- [docs.pmnd.rs/react-three-fiber](https://docs.pmnd.rs/react-three-fiber) — libreria usata per il Canvas 3D
- [github.com/pmndrs/drei](https://github.com/pmndrs/drei) — helper usati (`OrbitControls`, `Environment`, `ContactShadows`, `RoundedBox`, e `useGLTF` per il prossimo step)
- [gltf-transform.dev](https://gltf-transform.dev/) — compressione Draco/meshopt dei modelli `.glb`, da usare nell'asset pipeline non ancora implementata
- `npx gltfjsx modello.glb` ([github.com/pmndrs/gltfjsx](https://github.com/pmndrs/gltfjsx)) — genera lo scheletro React da un file GLTF/GLB esportato da CAD/slicer

## Struttura

```
enterprise/
├── backend/            # API REST — porta 5000
│   ├── prisma/schema.prisma   # modello dati enterprise completo
│   ├── prisma/seed.ts         # dati demo (org "Nicolò Service", utenti, board)
│   └── src/
│       ├── routes/            # auth, organizations, users, roles,
│       │                      # projects, tasks, time-entries, chat, docs,
│       │                      # whiteboards, automations, reports, audit-logs
│       ├── middleware/auth.ts # JWT + permessi granulari (modulo+azione)
│       └── lib/automationEngine.ts  # motore "se X allora Y"
├── frontend/           # Next.js — porta 3100
│   ├── app/(app)/...   # dashboard, projects, time-tracking, chat, docs,
│   │                   # whiteboard, automations, reports, team
│   └── lib/mockData.ts # dati demo di fallback (vedi sopra)
└── docker-compose.yml  # Postgres dedicato (porta 5433)
```

## Modello dati (sintesi)

- **Organization / Membership / Role / RolePermission** — multi-tenant e
  RBAC granulare: ogni ruolo ha permessi per modulo (`projects`, `tasks`,
  `chat`, `docs`, `automations`, `reports`, `roles`, ...) e azione (`READ`,
  `WRITE`, `DELETE`, `MANAGE`). Pronto per SSO futuro (basta aggiungere un
  provider OAuth/SAML sopra `Membership`).
- **AuditLog** — ogni azione sensibile (creazione progetto, cambio ruolo,
  spostamento task, ecc.) viene loggata con utente, entità e metadata.
- **Project / BoardColumn / Task / ChecklistItem** — Kanban con sottotask,
  priorità, stato, assegnatario, checklist.
- **TimeEntry** — cronometro (start/stop) e registrazioni manuali, collegate
  a task/progetto per la reportistica.
- **ChatChannel / ChatMessage** — canali pubblici/privati (REST; realtime
  via WebSocket è roadmap).
- **Doc** — albero di pagine wiki (`parentDocId` per la gerarchia).
- **Whiteboard** — elementi persistiti come JSON (`elementsJson`), pronto
  per un editor canvas interattivo.
- **AutomationRule / AutomationRunLog** — regole trigger→azione con log di
  esecuzione, valutate da `lib/automationEngine.ts`.

## Avvio in locale

```bash
cd enterprise
docker compose up -d          # Postgres dedicato su :5433

cd backend
cp .env.example .env          # rivedi JWT_SECRET prima di produzione
npm install
npm run db:push                # crea le tabelle da schema.prisma
npm run db:seed                # utenti demo: admin@nicoloservice.it / password123
npm run dev                    # API su http://localhost:5000

# in un altro terminale
cd ../frontend
cp .env.example .env.local
npm install
npm run dev                    # UI su http://localhost:3100
```

Il frontend è navigabile anche **senza** eseguire i passi backend: le
pagine mostrano i dati demo (`lib/mockData.ts`) finché l'API non risponde.

## Roadmap (prossimi passi per il "pieno sviluppo")

1. **Auth UI** — schermate login/registrazione collegate a `/api/auth/*`
   (oggi la UI salta direttamente alle pagine con dati demo).
2. **Integrazione API reale nelle pagine** — sostituire `mockData` con
   `lib/api.ts` (`withFallback`) in ogni pagina, così i dati veri "vincono"
   appena il backend è raggiungibile, senza rompere nulla se non lo è.
3. **Drag & drop Kanban** — `KanbanBoard` è già strutturato per riceverlo:
   basta collegare `onDrop` a `POST /api/tasks/:id/move`.
4. **Realtime chat/whiteboard** — oggi REST-only; aggiungere WebSocket (o
   Server-Sent Events) per push immediato invece del refetch.
5. **Editor whiteboard interattivo** — oggi la pagina mostra un esempio SVG
   statico; il modello dati (`Whiteboard.elementsJson`) è già pronto per
   salvare shape reali disegnate dall'utente.
6. **Editor doc ricco** (oggi `contentHtml` è già nel modello, manca un
   editor WYSIWYG lato frontend).
7. **AI assistant** — modulo non ancora scaffoldato: valutare se
   integrarlo come servizio backend dedicato (riassunti task, suggerimenti
   automazioni) quando le priorità saranno definite.
8. **Deploy** — oggi pensato per sviluppo locale; da replicare lo schema di
   deploy del CRM-APP (Netlify frontend + VPS/Docker backend) su infrastruttura
   propria, dato che è un sistema separato.
9. **Configuratore 3D — modello reale** — build verificata
   (`@react-three/drei` deve restare `^10.x`: la `^9.x` ha come peer
   dependency `@react-three/fiber@^8`, incompatibile con `@react-three/fiber
   @^9`/React 19 usati qui). Manca ancora l'asset pipeline (compressione
   Draco/meshopt) e il caricamento di un vero modello `.glb` al posto della
   geometria demo — vedi sezione "Configuratore 3D" sopra.
