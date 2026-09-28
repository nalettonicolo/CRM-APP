# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Nicolò Service — gestionale interno (non un prodotto da rivendere): clienti,
preventivi, interventi, magazzino, calendario, area cliente. Multi-utente,
nessuna registrazione pubblica (solo admin crea account). npm workspaces
monorepo: `backend` (Express 5 + Prisma + PostgreSQL) e `frontend` (Next.js 15
+ React 19 + TypeScript + Tailwind 4, deploy Netlify).

A second, independent codebase lives in `enterprise/` — a parallel
"enterprise" management app (project/task Kanban, automations, chat,
docs/wiki, time tracking, whiteboard, BI, granular RBAC). It has its own
`package.json`s, Prisma schema, and ports (backend :5000, frontend :3100) and
is **not** part of the root npm workspaces or CI — see `enterprise/README.md`
for its own commands and architecture. Do not assume root-level commands
below apply to it.

## Commands (root `backend`/`frontend` workspaces)

```bash
npm run install:all              # install root + backend + frontend
npm run dev                      # backend :4000 + frontend :3000 concurrently
npm run build                    # build backend then frontend
npm run build:frontend           # build only frontend (workspace crm-frontend)
npm run verify:netlify           # npm ci + build frontend — mirrors the Netlify/CI pipeline, run before pushing frontend changes

npm run db:generate              # prisma generate (backend)
npm run db:push                  # prisma db push (no migrations dir in prod/Mint)
npm run db:migrate               # prisma migrate dev
npm run db:seed                  # seed CRM db (also creates/aligns admin from ADMIN_EMAIL/ADMIN_PASSWORD in backend/.env)
npm run db:studio                # prisma studio
npm run db:test                  # test DB connection (tsx scripts/test-connection.ts)
```

Backend-only (`--workspace=backend` or `cd backend`):

```bash
npm run test                     # tsx --test src/**/*.test.ts — all *.test.ts
tsx --test src/utils/queryInput.test.ts   # run a single test file
npm run test:security            # currently == the queryInput test
npm run db:push:ie               # db push against the IE (Impianti Elettrici) database
npm run db:seed:ie               # seed the IE database
npm run backup                   # pg_dump backup (tsx scripts/backup.ts), needs pg_dump installed
```

Frontend build failures on Windows (`next build` / `.next` `ENOTEMPTY`) are
handled by a `prebuild` script that cleans `.next` first
(`scripts/clean-frontend-next.cjs`) — don't work around this manually.

CI (`.github/workflows/ci.yml`) runs two independent jobs on push/PR: backend
(`prisma generate` + `tsc` build) and `frontend-netlify` (same build as the
real Netlify deploy, workspace `crm-frontend`). There is no automated test
job in CI beyond the TypeScript builds — the `backend/src/**/*.test.ts` suite
is not currently wired into CI.

## Architecture

### Dual-database "workspace" routing (the main non-obvious mechanism)

The backend actually talks to **two separate Postgres databases** through
one Express app: the main CRM (`DATABASE_URL`) and an "Impianti Elettrici"
(IE) business line (`DATABASE_URL_IE`, optional — features degrade if unset).
Route handlers and services never choose a client explicitly; they all
`import { prisma } from "../lib/prisma.js"`, which is a `Proxy` that resolves
per-request via `AsyncLocalStorage` (`backend/src/lib/prisma.ts`).

The switch happens in `backend/src/middleware/workspaceDb.ts`:
`wantsIeWorkspace(req)` is true when the request has header `X-Workspace: ie`
**and** its path matches one of a fixed prefix list (`/api/clients`,
`/api/quotes`, `/api/inventory`, `/api/invoices`, `/api/transport-documents`,
`/api/job-orders`, `/api/daily-reports`, `/api/supplier-catalogs`,
`/api/supplier-bills`, `/api/client-expenses`, `/api/payments`, etc.). The
`authenticate` middleware (`backend/src/middleware/auth.ts`) calls this,
binds the right Prisma client via `runWithDb`, and lazily provisions the IE
mirror of the current user (`ensureIeActor`) and a default IE warehouse
(`ensureIeWarehouse`) on first use. When adding a route to one of those
prefixes, remember it is reachable against **both** databases depending on
the caller's header — keep IE-specific data changes (e.g. client seeding,
route in `backend/src/routes/clients.ts` vs any IE-only route) intentional,
not accidental. `prismaCrm` / `prismaIe` (raw clients, `prismaIe` nullable)
are exported from the same file when a handler must bypass the per-request
switch.

### RBAC / permissions

Roles are a fixed Prisma enum (`UserRole`), not DB rows. Permission checks
go through `hasPermission(role, resource, action)`
(`backend/src/utils/permissions.ts` → `backend/src/services/permissionStore.ts`,
defaults in `backend/src/constants/permissionCatalog.ts`), used both by route
middleware and directly in handlers for "own records only" restrictions
(`canAccessOwnOnly`). `req.user` (`AuthRequest`, set by `authenticate`) is the
source of the current role for every downstream check.

### Auth

JWT access token (`Authorization: Bearer` or `accessToken` cookie) + refresh
token flow with bcrypt-hashed passwords; cookie `SameSite`/`Secure` behavior
is driven by `TRUST_CROSS_SITE_COOKIES`/`COOKIE_SAMESITE` in
`backend/src/config/index.ts` because frontend (Netlify) and backend (VPS)
are typically on different domains in production.

### Backend layering

`routes/` (Express routers, Zod validation) → `services/` (business logic:
PDF generation, email, document numbering, quote calculators, activity
logging, etc.) → Prisma. Cross-cutting concerns as `middleware/` (auth,
workspace DB routing, error handling). `constants/` holds catalogs
(permissions, event types, document copy/text templates) kept out of code
for easy editing.

### Frontend

Next.js App Router under `frontend/src/app/`, with a `(app)` route group for
the authenticated shell distinct from public routes (`login`,
`forgot-password`, `impianti-elettrici`, legal pages). State: Zustand
(`src/store/`) + TanStack Query. `src/components/` is organized by domain
(clients, quotes, interventions, inventory, invoices, calendar, transport,
site-visits, reports, settings, ...) mirroring the backend route modules —
when a backend module gets a new field/endpoint, its frontend counterpart is
usually the same-named subfolder.

## Deploy model

Push to `main` triggers, in parallel: Netlify frontend build (package
directory `frontend`, workspace `crm-frontend`), GitHub Actions CI, and (if
SSH secrets configured) a Mint VPS backend deploy — see
`.cursor/rules/deploy-github.mdc`. Default convention: **commit and push to
`main`** after a completed, verified change unless the user explicitly says
not to; never force-push `main`; never amend a commit already on remote. Run
`npm run verify:netlify` before pushing frontend changes to mirror the real
Netlify/CI build locally. Full deploy docs are indexed in `docs/README.md`
(VPN/Tailscale, Netlify, SMTP, production reference, Mint restore/upgrade).

Production note: there is no `prisma/migrations` folder on Mint — schema
updates there go through `npm run db:push` (or
`backend/scripts/upgrade-mint.sh`), not `db:migrate`.
