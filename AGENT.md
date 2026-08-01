# AGENT.md — AI Agent Guide (FinPlan)

> Read this file FIRST before making any changes to this project.

---

## Project Identity

**FinPlan** — Personal finance tracker, single-user, private.
**Production:** `finplan.apicode.my.id`
**Stack:** Cloudflare Workers + Hono + Drizzle ORM + D1 (SQLite) + Vite + TypeScript

---

## Mandatory Rules

### 1. Before Coding
- Read `docs/architecture/schema-en.md` to understand database structure
- Read `docs/business-logic/calculations-en.md` to understand calculation logic
- Read `CODERULES.md` for code conventions
- Grep HTML element references before deleting: `grep -rn "element-id" frontend/`

### 2. Deploy
**NEVER run `npx wrangler deploy` or any manual deploy command.**
Deploy dilakukan otomatis oleh Cloudflare Pages/Workers via git push ke `main`.
Cukup `git push` — Cloudflare akan build dan deploy otomatis.

### 3. Database Migration
```bash
# REQUIRED: run migrations BEFORE deploy if schema changed
npm run db:migrate:remote    # apply to production
npm run db:migrate:local     # apply to local
```
**DO NOT** use `wrangler migrations apply` — always use `wrangler d1 migrations apply finplan --remote`.

### 4. Git
- Only commit when user **explicitly** requests it
- Push to `main` directly if requested (single-user project)

---

## Automatic Agent Tasks

### When schema changes (`src/db/schema.ts`)
1. Generate new migration: `npm run db:generate`
2. Review the generated SQL file in `migrations/`
3. Apply to local: `npm run db:migrate:local`
4. Update `docs/architecture/schema-id.md` and `schema-en.md`
5. Update `migrations/MIGRATION.md` — add new migration entry
6. Apply to production: `npm run db:migrate:remote`

### When business logic/calculations change
1. Update `docs/business-logic/calculations-id.md` and `calculations-en.md`
2. Ensure formulas in documentation match code in `src/routes/months.ts`

### When there is an important bug/problem
1. Create new file in `docs/problem-solution/` with format: `NNN-problem-name-id.md` and `NNN-problem-name-en.md`
2. Sequential numbering from `001`, `002`, etc.
3. Criteria for "important": problem that breaks a core feature, or a bug pattern likely to recur
4. Template: see `docs/problem-solution/001-blank-homepage-breakdown-element-en.md`
5. **MANDATORY: update the doc immediately after the fix is verified and pushed** — do not delay
6. Every problem-solution doc must contain:
   - Deskripsi masalah yang jelas
   - Root cause (bukan hanya gejala)
   - Solusi lengkap dengan code before/after
   - Lessons learned / aturan baru agar masalah tidak terulang
   - Commit hash yang relevan

### When frontend changes (HTML/CSS/TS)
- If removing element from `index.html`: grep `frontend/` first for all references
- If adding new feature: update `docs/tech-stack/overview-en.md` if relevant
- **ALWAYS run `npm run format` before committing** — format semua TS files dengan Prettier
- After changes: `npm run build` to verify, then `git push` — Cloudflare deploys automatically

### When adding/editing UI strings
- **All strings must go through `t()`** — no hardcoded Indonesian/English in template literals or HTML
- Static HTML: use `data-i18n="key"` on elements
- Input placeholders: use `data-i18n-placeholder="key"`
- Dynamic TS: use `t('key')` in template literals
- `data-label` on `<td>`: use `data-label="${t('key')}"` — visible as label on mobile
- When adding key to `id:`, always add English equivalent to `en:` in same commit
- Audit command: `grep -rn 'data-label="[A-Z]' frontend/pages/`

### CSS / Responsive Rules
- **One mobile breakpoint only: `@media (max-width: 768px)`** — never use `600px` for mobile
- Never reuse class names across different components (e.g. `.income-amount` in stat card vs table row)
- All border-radius must use `var(--radius)` or `var(--radius-lg)` — no hardcoded px values
- Sibling card containers must have the same width — avoid `max-width` on cards placed side by side
- For tables with different desktop/mobile layout: use separate `thead` (e.g. `income-thead-desktop`, `income-thead-mobile`)
- Desktop and mobile column visibility: use explicit class pairs (e.g. `income-desktop`, `income-cell-main`)
- Current global CSS variables: `--radius: 10px`, `--radius-lg: 16px`

---

## Key File Map

```
src/
├── index.ts               ← Worker entry point, route registration
├── auth.ts                ← GitHub OAuth, session handling
├── middleware.ts          ← Auth middleware
├── db/schema.ts           ← Database schema (source of truth)
├── lib/db.ts              ← Drizzle DB client
├── lib/params.ts          ← URL param helpers
├── shared/types.ts        ← Shared TypeScript types
├── routes/
│   ├── months.ts          ← Core summary/calculation logic + auto-create
│   ├── expenses.ts        ← Budget expenses CRUD
│   ├── daily.ts           ← Daily expense CRUD
│   ├── incomes.ts         ← Income CRUD
│   ├── investments.ts     ← Investment CRUD
│   ├── projections.ts     ← Projection CRUD
│   └── assets.ts          ← Global assets CRUD
└── validators/            ← Zod validators per entity
frontend/
├── index.html             ← Main SPA HTML
├── login.html             ← Login page
├── unauthorized.html      ← Unauthorized page
├── main.ts                ← App bootstrap (entry point)
├── style.css              ← Glassmorphism CSS
├── services/              ← Core app logic
│   ├── api.ts             ← Fetch wrapper & API calls
│   ├── data.ts            ← Data loading, read-only mode
│   ├── navigation.ts      ← Page routing, topbar control
│   └── state.ts           ← Reactive app state
├── helpers/               ← Utilities & UI helpers
│   ├── i18n.ts            ← Translations (ID/EN)
│   ├── modals.ts          ← Modal open/close helpers
│   ├── selects.ts         ← Dropdown populate helpers
│   ├── toast.ts           ← Toast notifications
│   └── utils.ts           ← Utility functions
├── pages/                 ← Page render functions
│   ├── home.ts            ← Dashboard/summary page
│   ├── setup.ts           ← Budget setup page
│   ├── daily.ts           ← Daily expenses page
│   └── projection.ts      ← Standalone projection page
├── actions/               ← Form submit handlers per entity
│   ├── asset.ts, confirm.ts, daily.ts, expense.ts
│   ├── income.ts, investment.ts, month.ts, projection.ts
└── public/
    └── assets/
        ├── images/        ← bg.jpeg, logo.jpeg, favicon.png
        └── vendor/        ← Chart.js, FontAwesome (static)
database/
└── seeds/seed-dummy.sql   ← Dummy data for local development
migrations/                ← Drizzle SQL migration files
docs/
├── architecture/          ← schema-id.md, schema-en.md
├── business-logic/        ← calculations-id.md, calculations-en.md
├── tech-stack/            ← overview-id.md, overview-en.md
├── features/              ← Feature documentation
└── problem-solution/      ← 001-...-id.md, 001-...-en.md, etc.
```

---

## Things NEVER to Do

- Do not install new dependencies without user confirmation
- Do not delete data from production database
- Do not change `ALLOWED_EMAIL` or auth configuration
- Do not deploy without verifying no new JS errors introduced
- Do not commit/push without explicit user instruction

---

## Things to Watch Out For

### DOM Null Safety
The `el(id)` function in `app.js` wraps `document.getElementById()`. Always check for null before accessing properties:
```javascript
// CORRECT:
const bEl = el('some-id');
if (bEl) bEl.innerHTML = '...';

// WRONG — will crash and blank the entire page:
el('some-id').innerHTML = '...';
```

### Expense Categories
Valid enum: `'fixed'`, `'variable'`, `'periodic'`, `'tabungan'`
There is **NO** `'daily'` category in the `expenses` table.

### Daily Expenses vs Budget
- `expenses` table = **budget** (plan) — used for BVA
- `daily_expenses` table = **actual** (real) — used for `sisaSebelumGajian`
- These are DIFFERENT and must not be mixed in remaining balance calculations

### Assets = Global
The `assets` table has no `month_id` — it is global across all months.

---

## Environment Variables

Stored in `.dev.vars` (local) and Cloudflare Workers Secrets (production):
```
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
ALLOWED_EMAIL
SESSION_SECRET
```
**NEVER** expose these secret values in responses or logs.
