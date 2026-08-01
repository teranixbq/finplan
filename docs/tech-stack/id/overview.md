# Tech Stack — FinPlan

---

## Overview

FinPlan adalah aplikasi personal finance tracker yang berjalan sepenuhnya di Cloudflare infrastructure. Single-user, private. Frontend dibangun dengan Vite + TypeScript dan di-deploy sebagai static assets via Cloudflare Workers Assets.

---

## Runtime & Deployment

| Komponen | Teknologi | Versi |
|----------|-----------|-------|
| Runtime | Cloudflare Workers | compatibility_date: 2025-04-18 |
| Deploy CLI | Wrangler | ^4.22.0 |
| Domain | finplan.apicode.my.id | Custom domain via Cloudflare |

**Cara deploy:**
```bash
git push   # Cloudflare auto-deploy saat push ke main
```

---

## Backend

| Komponen | Teknologi | Versi |
|----------|-----------|-------|
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
  /api/months          → CRUD bulan + summary
  /api/assets          → CRUD asset dana cair
  /api/investments     → CRUD investasi
  /api/expenses        → CRUD template pengeluaran
  /api/incomes         → CRUD pemasukan tambahan
  /api/daily           → CRUD pengeluaran harian aktual
  /api/projections     → CRUD proyeksi bulan depan
  /api/me              → Info user dari session
```

---

## Frontend

| Komponen | Teknologi | Keterangan |
|----------|-----------|------------|
| Build Tool | Vite | 6.3.5 — bundler + dev server |
| Language | TypeScript | ^5.8.3 — strict mode |
| Styling | Vanilla CSS (glassmorphism) | Tidak ada Tailwind, tidak ada framework CSS |
| Charts | Chart.js | ^4.5.1 — self-hosted di `frontend/public/assets/vendor/` |
| Icons | FontAwesome | Self-hosted di `frontend/public/assets/vendor/fontawesome/` |
| i18n | Custom (`frontend/helpers/i18n.ts`) | Support ID/EN — semua string UI wajib pakai `t()` |

**Entry point:** `frontend/main.ts` → di-bundle Vite → `dist/`

**Static assets:** Di-serve via Cloudflare Workers Assets (`assets.directory: "./dist"` di `wrangler.jsonc`)

**Frontend module structure:**
```
frontend/
├── main.ts              # Entry point — expose window.* globals
├── style.css            # Glassmorphism CSS
├── services/
│   ├── state.ts         # Global state (AppState, S)
│   ├── api.ts           # Typed fetch wrapper ke /api/*
│   ├── data.ts          # Data loading (loadMonths, loadMonthData, reloadAll)
│   └── navigation.ts    # Page navigation & tab switching
├── helpers/
│   ├── i18n.ts          # Translations ID/EN
│   ├── utils.ts         # Helper functions (rp, fmtDate, dll)
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

**Shared types:** `src/shared/types.ts` — dipakai oleh backend (`src/`) dan frontend (`frontend/`) untuk kontrak API.

---

## Auth

- Provider: **GitHub OAuth**
- Strategy: Single-user whitelist via env var `ALLOWED_EMAIL`
- Session: Cookie `fp_session` (HttpOnly, Secure, SameSite=Lax)
- Session duration: 30 hari (disimpan di D1 `sessions` table)
- Token: 32-byte random hex (crypto.getRandomValues)

**Env vars yang dibutuhkan** (di `.dev.vars` lokal / Workers secrets di prod):
```
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
ALLOWED_EMAIL=
SESSION_SECRET=
```

---

## Database

| Aspek | Detail |
|-------|--------|
| Engine | SQLite (via Cloudflare D1) |
| Binding | `DB` |
| Database name | `finplan` |
| Database ID | `6d744fba-5b9c-41a1-902c-af36b4f4d163` |
| Migrations dir | `migrations/` |

**Cara generate migrasi:**
```bash
npm run db:generate           # drizzle-kit generate
npm run db:migrate:local      # apply ke lokal
npm run db:migrate:remote     # apply ke produksi
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
│   │   ├── months.ts         # Bulan + summary calculation
│   │   ├── assets.ts         # Dana cair
│   │   ├── investments.ts    # Investasi
│   │   ├── expenses.ts       # Template pengeluaran
│   │   ├── incomes.ts        # Pemasukan tambahan
│   │   ├── daily.ts          # Pengeluaran harian aktual
│   │   └── projections.ts    # Proyeksi bulan depan
│   └── validators/           # Input validators
├── frontend/                 # Frontend source (Vite + TypeScript)
│   ├── index.html            # Main SPA entry
│   ├── login.html            # Login page
│   ├── unauthorized.html     # Unauthorized page
│   ├── main.ts               # Entry point — expose window.* globals
│   ├── style.css             # Glassmorphism CSS
│   ├── services/             # Core app logic
│   ├── helpers/              # Utilities & UI helpers
│   ├── pages/                # Fungsi render per halaman
│   ├── actions/              # Form submit/delete handlers
│   └── public/assets/        # images/, vendor/ (chart.min.js, fontawesome)
├── src/shared/
│   └── types.ts              # Shared API contract types (backend + frontend)
├── dist/                     # Hasil build Vite (gitignored)
├── migrations/               # SQL migration files
├── docs/                     # Dokumentasi project
├── AGENT.md                  # Instruksi untuk AI agent
├── CODERULES.md              # Coding conventions
├── vite.config.mts           # Vite config
├── tsconfig.json             # TS project references root
├── tsconfig.worker.json      # TS config untuk backend (src/)
├── tsconfig.app.json         # TS config untuk frontend (frontend/)
├── wrangler.jsonc            # Cloudflare Workers config
├── drizzle.config.ts         # Drizzle Kit config
└── package.json
```

---

## Observability

Cloudflare Workers Observability diaktifkan di `wrangler.jsonc`:
```json
"observability": { "enabled": true }
```
Log tersedia di Cloudflare dashboard → Workers → finplan → Logs.
