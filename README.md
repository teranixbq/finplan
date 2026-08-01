# FinPlan

Personal finance tracker built with Cloudflare Workers, Hono, Drizzle ORM, D1, and Vite + TypeScript.

**Production:** `finplan.apicode.my.id`

---

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Cloudflare Workers |
| Backend | Hono + Drizzle ORM + D1 (SQLite) |
| Frontend | Vite + TypeScript (SPA, no framework) |
| Styling | Vanilla CSS (glassmorphism) |
| Charts | Chart.js (self-hosted) |
| Icons | FontAwesome (self-hosted) |
| Auth | GitHub OAuth (single-user, email allowlist) |
| i18n | Custom (Indonesian / English) |
| Deploy | Auto via Cloudflare on `git push main` |

---

## Features

- Monthly budget planning (salary, expenses, investments, savings)
- Daily expense tracking with BVA (Budget vs Actual)
- Income and investment tracking per month
- Global assets management with carryover balance
- Month auto-creation on first access
- Read-only mode for non-current months
- Projection planning (next month budget preview + month comparison)
- Toggle active/inactive expenses with switch UI
- Bilingual UI (Indonesian / English)
- Responsive — desktop + mobile (bottom nav)

---

## Project Structure

```
src/                        ← Cloudflare Worker (Hono)
├── index.ts                ← Entry point, route registration
├── auth.ts                 ← GitHub OAuth, session
├── middleware.ts           ← Auth middleware
├── db/schema.ts            ← Database schema (source of truth)
├── lib/                    ← DB client, param helpers
├── routes/                 ← API route handlers
├── shared/types.ts         ← Shared API contract types (backend + frontend)
└── validators/             ← Zod validators
frontend/                   ← Vite SPA (TypeScript)
├── index.html              ← Main HTML
├── main.ts                 ← Bootstrap (entry point)
├── style.css               ← Glassmorphism CSS
├── services/
│   ├── api.ts              ← Fetch wrapper & API calls
│   ├── data.ts             ← Data loading, read-only mode
│   ├── navigation.ts       ← Page routing, topbar
│   └── state.ts            ← Reactive app state
├── helpers/
│   ├── i18n.ts             ← Translations (ID/EN) — all UI strings via t()
│   ├── modals.ts           ← Modal helpers
│   ├── selects.ts          ← Dropdown helpers
│   ├── toast.ts            ← Toast notifications
│   └── utils.ts            ← Utility functions
├── pages/                  ← home, setup, daily, projection
├── actions/                ← Form submit handlers
└── public/
    └── assets/
        ├── images/         ← bg.jpeg, logo.jpeg, favicon.png
        └── vendor/         ← Chart.js, FontAwesome (static)
database/
└── seeds/seed-dummy.sql    ← Dummy data for local dev
migrations/                 ← Drizzle SQL migrations
docs/
├── architecture/           ← Database schema docs (ID/EN)
├── business-logic/         ← Calculation logic docs (ID/EN)
├── features/               ← Feature-specific docs
├── problem-solution/       ← Bug history & solutions (ID/EN)
└── tech-stack/             ← Tech stack overview (ID/EN)
```

---

## Requirements

- Node.js 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- Cloudflare account with D1 database created

---

## Setup

```bash
npm install
cp .dev.vars.example .dev.vars
# Fill in the values in .dev.vars
```

---

## Environment Variables

Create `.dev.vars` for local development:

```
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
ALLOWED_EMAIL=your@email.com
SESSION_SECRET=random_64_char_string
```

For production, set these in the Cloudflare dashboard under **Settings > Variables and Secrets**.

---

## Development

```bash
npm run dev         # Vite dev server at http://localhost:8787
npm run worker:dev  # Cloudflare Worker dev server
```

---

## Available Scripts

```bash
npm run build           # Build frontend (Vite)
npm run format          # Format all TS, CSS, HTML with Prettier
npm run format:check    # Check formatting without writing
npm run db:generate     # Generate Drizzle migration
npm run db:migrate:local   # Apply migrations to local D1
npm run db:migrate:remote  # Apply migrations to production D1
```

---

## Database Migration

```bash
# Local
npm run db:migrate:local

# Production
npm run db:migrate:remote
```

**NEVER** use `wrangler migrations apply` directly — always use the npm scripts above.

---

## Deploy

Push to `main` — Cloudflare builds and deploys automatically.

```bash
git push
```

Do **not** run `wrangler deploy` manually.

---

## GitHub OAuth Setup

1. Go to GitHub Settings > Developer Settings > OAuth Apps > New OAuth App
2. Set **Homepage URL** to your domain
3. Set **Authorization callback URL** to `https://yourdomain.com/auth/github/callback`
4. Copy Client ID and Client Secret to `.dev.vars` and Cloudflare environment variables

---

## Docs

See `docs/` for detailed documentation:

- `docs/architecture/` — database schema
- `docs/business-logic/` — calculation formulas
- `docs/problem-solution/` — bug history and solutions
- `docs/tech-stack/` — tech stack overview

For AI agent instructions, see `AGENT.md`.
For coding conventions, see `CODERULES.md`.
