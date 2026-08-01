# Tech Stack — FinPlan

---

## Overview

FinPlan is a personal finance tracker application running entirely on Cloudflare infrastructure. Single-user, private. Frontend is built with Vite + TypeScript and served as static assets via Cloudflare Workers Assets.

---

## Runtime & Deployment

| Component | Technology | Version |
|-----------|------------|---------|
| Runtime | Cloudflare Workers | compatibility_date: 2025-04-18 |
| Deploy CLI | Wrangler | ^4.22.0 |
| Domain | finplan.apicode.my.id | Custom domain via Cloudflare |

**Deploy command:**
```bash
git push   # Cloudflare auto-deploys on push to main
```

---

## Backend

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Hono | ^4.7.11 |
| Language | TypeScript | ^5.8.3 |
| Database | Cloudflare D1 (SQLite) | — |
| ORM | Drizzle ORM | ^0.44.2 |
| Schema gen | Drizzle Kit | ^0.31.1 |

**Entry point:** `src/index.ts`

**Route structure:**
```
/auth/github           → GitHub OAuth login
/auth/github/callback  → OAuth callback
/auth/logout           → Logout (POST)
/api/*                 → Protected (authMiddleware)
  /api/months          → CRUD months + summary
  /api/assets          → CRUD liquid assets
  /api/investments     → CRUD investments
  /api/expenses        → CRUD expense templates
  /api/incomes         → CRUD additional income
  /api/daily           → CRUD actual daily expenses
  /api/projections     → CRUD next month projections
  /api/me              → User info from session
```

---

## Frontend

| Component | Technology | Notes |
|-----------|------------|-------|
| Build Tool | Vite | 6.3.5 — bundler + dev server |
| Language | TypeScript | ^5.8.3 — strict mode |
| Styling | Vanilla CSS (glassmorphism) | No Tailwind, no CSS framework |
| Charts | Chart.js | ^4.5.1 — self-hosted in `frontend/public/assets/vendor/` |
| Icons | FontAwesome | Self-hosted in `frontend/public/assets/vendor/fontawesome/` |
| i18n | Custom (`frontend/helpers/i18n.ts`) | ID/EN support |

**Entry point:** `frontend/main.ts` → bundled by Vite → `dist/`

**Static assets:** Served via Cloudflare Workers Assets (`assets.directory: "./dist"` in `wrangler.jsonc`)

**Frontend module structure:**
```
frontend/
├── main.ts              # Entry point — expose window.* globals
├── style.css            # Glassmorphism CSS
├── services/
│   ├── state.ts         # Global state (AppState, S)
│   ├── api.ts           # Typed fetch wrapper to /api/*
│   ├── data.ts          # Data loading (loadMonths, loadMonthData, reloadAll)
│   └── navigation.ts    # Page navigation & tab switching
├── helpers/
│   ├── i18n.ts          # Translations ID/EN
│   ├── utils.ts         # Helper functions (rp, fmtDate, etc)
│   ├── toast.ts         # Toast notification
│   ├── modals.ts        # Modal open/close + breakdown modal
│   └── selects.ts       # Populate dropdown selects
├── pages/
│   ├── home.ts          # Render homepage
│   ├── setup.ts         # Render setup page
│   ├── daily.ts         # Render daily page + chart + filter
│   └── projection.ts    # Render projection page (standalone)
├── actions/
│   ├── asset.ts         # Submit/delete asset
│   ├── confirm.ts       # Double-tap delete confirm
│   ├── daily.ts         # Submit/delete daily expense
│   ├── expense.ts       # Submit/delete/toggle expense
│   ├── income.ts        # Submit/delete income
│   ├── investment.ts    # Submit/delete investment
│   ├── month.ts         # Submit new month / edit salary
│   └── projection.ts    # Submit/edit/delete projection
└── public/
    └── assets/
        ├── images/      # bg.jpeg, logo.jpeg, favicon.png
        └── vendor/      # chart.min.js, fontawesome (self-hosted)
```

**Shared types:** `src/shared/types.ts` — used by both backend (`src/`) and frontend (`frontend/`) as API contract.

---

## Auth

- Provider: **GitHub OAuth**
- Strategy: Single-user whitelist via env var `ALLOWED_EMAIL`
- Session: Cookie `fp_session` (HttpOnly, Secure, SameSite=Lax)
- Session duration: 30 days (stored in D1 `sessions` table)
- Token: 32-byte random hex (crypto.getRandomValues)

**Required env vars** (in `.dev.vars` locally / Workers secrets in prod):
```
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
ALLOWED_EMAIL=
SESSION_SECRET=
```

---

## Database

| Aspect | Detail |
|--------|--------|
| Engine | SQLite (via Cloudflare D1) |
| Binding | `DB` |
| Database name | `finplan` |
| Database ID | `6d744fba-5b9c-41a1-902c-af36b4f4d163` |
| Migrations dir | `migrations/` |

**Migration commands:**
```bash
npm run db:generate           # drizzle-kit generate
npm run db:migrate:local      # apply to local
npm run db:migrate:remote     # apply to production
```

---

## Project Structure

```
finplan/
├── src/
│   ├── index.ts              # Entry point, route registration
│   ├── auth.ts               # GitHub OAuth, session management
│   ├── middleware.ts         # Auth middleware
│   ├── db/
│   │   └── schema.ts         # Drizzle schema definitions
│   ├── routes/
│   │   ├── months.ts         # Months + summary calculation
│   │   ├── assets.ts         # Liquid assets
│   │   ├── investments.ts    # Investments
│   │   ├── expenses.ts       # Expense templates
│   │   ├── incomes.ts        # Additional income
│   │   ├── daily.ts          # Actual daily expenses
│   │   └── projections.ts    # Next month projections
│   └── validators/           # Input validators
├── frontend/                 # Frontend source (Vite + TypeScript)
│   ├── index.html            # Main SPA entry
│   ├── login.html            # Login page
│   ├── unauthorized.html     # Unauthorized page
│   ├── main.ts               # Entry point — expose window.* globals
│   ├── style.css             # Glassmorphism CSS
│   ├── services/             # Core app logic
│   ├── helpers/              # Utilities & UI helpers
│   ├── pages/                # Page render functions
│   ├── actions/              # Form submit/delete handlers
│   └── public/assets/        # images/, vendor/ (chart.min.js, fontawesome)
├── src/shared/
│   └── types.ts              # Shared API contract types (backend + frontend)
├── dist/                     # Vite build output (gitignored)
├── migrations/               # SQL migration files
├── docs/                     # Project documentation
├── AGENT.md                  # AI agent instructions
├── CODERULES.md              # Coding conventions
├── vite.config.mts           # Vite config
├── tsconfig.json             # TS project references root
├── tsconfig.worker.json      # TS config for backend (src/)
├── tsconfig.app.json         # TS config for frontend (frontend/)
├── wrangler.jsonc            # Cloudflare Workers config
├── drizzle.config.ts         # Drizzle Kit config
└── package.json
```

---

## Observability

Cloudflare Workers Observability enabled in `wrangler.jsonc`:
```json
"observability": { "enabled": true }
```
Logs available in Cloudflare dashboard → Workers → finplan → Logs.
