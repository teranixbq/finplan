# Tech Stack — FinPlan

---

## Overview

FinPlan adalah aplikasi personal finance tracker yang berjalan sepenuhnya di Cloudflare infrastructure. Single-user, private, no build step untuk frontend.

---

## Runtime & Deployment

| Komponen | Teknologi | Versi |
|----------|-----------|-------|
| Runtime | Cloudflare Workers | compatibility_date: 2025-04-18 |
| Deploy CLI | Wrangler | ^4.22.0 |
| Domain | finplan.apicode.my.id | Custom domain via Cloudflare |

**Cara deploy:**
```bash
npm run deploy        # wrangler deploy
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
| Language | Vanilla JS (ES6+) | Tidak ada framework/build step |
| Styling | Vanilla CSS (glassmorphism) | Tidak ada Tailwind, tidak ada build |
| Charts | Chart.js | ^4.5.1 — self-hosted di `/public/vendor/` |
| Icons | FontAwesome | Self-hosted di `/public/vendor/fontawesome/` |
| i18n | Custom (`/public/i18n.js`) | Support ID/EN |

**Static files:** Disajikan via Cloudflare Assets binding (`ASSETS`)

**Frontend state management:** Global object `S` di `app.js`:
```javascript
const S = {
  months, currentMonthId, summary,
  assets, expenses, investments,
  incomes, daily, projection,
  currentPage, currentTab,
  deleteConfirm, charts
}
```

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
├── public/
│   ├── index.html            # Main SPA
│   ├── login.html            # Login page
│   ├── unauthorized.html     # Unauthorized page
│   ├── app.js                # Frontend state, render, API calls
│   ├── style.css             # Glassmorphism CSS
│   ├── i18n.js               # Translations (ID/EN)
│   └── vendor/               # chart.min.js, fontawesome
├── drizzle/
│   └── migrations/           # SQL migration files
├── docs/                     # Dokumentasi project
├── AGENT.md                  # Instruksi untuk AI agent
├── CODERULES.md              # Coding conventions
├── migrations/MIGRATION.md          # Panduan migrasi DB
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
