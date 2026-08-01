# FinPlan

Personal finance tracker built with Cloudflare Workers, Hono, Drizzle ORM, D1, and Vite + TypeScript.

## Stack

- **Backend:** Cloudflare Workers + Hono + Drizzle ORM + D1 (SQLite)
- **Frontend:** Vite + TypeScript (SPA, no framework)
- **Auth:** GitHub OAuth (single-user, email allowlist)
- **Deploy:** Auto via Cloudflare on `git push main`

## Features

- Monthly budget planning (salary, expenses, investments, savings)
- Daily expense tracking with BVA (Budget vs Actual)
- Income and investment tracking per month
- Global assets management
- Month auto-creation on first access
- Read-only mode for non-current months
- Projection planning (next month budget preview + comparison)
- Bilingual UI (Indonesian / English)

## Project Structure

```
src/                        ← Cloudflare Worker (Hono)
├── index.ts                ← Entry point, route registration
├── auth.ts                 ← GitHub OAuth, session
├── middleware.ts           ← Auth middleware
├── db/schema.ts            ← Database schema (source of truth)
├── lib/                    ← DB client, param helpers
├── routes/                 ← API route handlers
└── validators/             ← Zod validators
frontend/                   ← Vite SPA (TypeScript)
├── index.html              ← Main HTML
├── main.ts                 ← Bootstrap
├── navigation.ts           ← Page routing, topbar
├── data.ts                 ← API calls, read-only mode
├── i18n.ts                 ← Translations (ID/EN)
├── pages/                  ← home, setup, daily, projection
├── actions/                ← Form submit handlers
└── public/assets/vendor/   ← Chart.js, FontAwesome (static)
database/
└── seeds/seed-dummy.sql    ← Dummy data for local dev
migrations/                 ← Drizzle SQL migrations
docs/                       ← Architecture, business logic, features
```

## Requirements

- Node.js 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- Cloudflare account with D1 database created

## Setup

```bash
npm install
cp .dev.vars.example .dev.vars
# Fill in the values in .dev.vars
```

## Environment Variables

Create `.dev.vars` for local development:

```
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
ALLOWED_EMAIL=your@email.com
SESSION_SECRET=random_64_char_string
```

For production, set these in the Cloudflare dashboard under **Settings > Variables and Secrets**.

## Database Migration

```bash
# Local
npm run db:migrate:local

# Production
npm run db:migrate:remote
```

## Development

```bash
npm run dev
```

App runs at `http://localhost:8787`.

## Deploy

Push to `main` — Cloudflare builds and deploys automatically.

```bash
git push
```

Do **not** run `wrangler deploy` manually.

## GitHub OAuth Setup

1. Go to GitHub Settings > Developer Settings > OAuth Apps > New OAuth App
2. Set **Homepage URL** to your domain
3. Set **Authorization callback URL** to `https://yourdomain.com/auth/github/callback`
4. Copy Client ID and Client Secret to `.dev.vars` and Cloudflare environment variables
