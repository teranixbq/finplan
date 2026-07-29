# Tech Stack — FinPlan

---

## Overview

FinPlan is a personal finance tracker application running entirely on Cloudflare infrastructure. Single-user, private, no frontend build step.

---

## Runtime & Deployment

| Component | Technology | Version |
|-----------|------------|---------|
| Runtime | Cloudflare Workers | compatibility_date: 2025-04-18 |
| Deploy CLI | Wrangler | ^4.22.0 |
| Domain | finplan.apicode.my.id | Custom domain via Cloudflare |

**Deploy command:**
```bash
npm run deploy        # wrangler deploy
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
| Language | Vanilla JS (ES6+) | No framework, no build step |
| Styling | Vanilla CSS (glassmorphism) | No Tailwind, no build |
| Charts | Chart.js | ^4.5.1 — self-hosted at `/public/vendor/` |
| Icons | FontAwesome | Self-hosted at `/public/vendor/fontawesome/` |
| i18n | Custom (`/public/i18n.js`) | ID/EN support |

**Static files:** Served via Cloudflare Assets binding (`ASSETS`)

**Frontend state management:** Global `S` object in `app.js`:
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
├── docs/                     # Project documentation
├── AGENT.md                  # AI agent instructions
├── CODERULES.md              # Coding conventions
├── migrations/MIGRATION.md          # DB migration guide
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
