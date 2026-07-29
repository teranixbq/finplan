# CODERULES.md — FinPlan Code Conventions

---

## Formatting — Prettier

Semua file TypeScript di `src/` **wajib** diformat dengan Prettier sebelum commit.

Config aktif di `.prettierrc`:
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

Commands:
```bash
npm run format        # format semua src/**/*.ts
npm run format:check  # check tanpa mengubah file (CI-friendly)
```

**Jangan** format manual atau pakai style berbeda — biarkan Prettier yang handle. Cloudflare auto-deploy dari repo, jadi pastikan format bersih sebelum push.

---

## Backend (TypeScript / Hono / Drizzle)

### Route Structure
Setiap route file mengikuti pattern ini — pakai `getDb` dan `parseId` dari lib:
```typescript
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { tableName } from '../db/schema';
import { getDb, now } from '../lib/db';
import { parseId } from '../lib/params';
import type { Env } from '../auth';

const app = new Hono<{ Bindings: Env }>();

// GET, POST, PUT, DELETE handlers here

export default app;
```

### Helpers — wajib digunakan

**`src/lib/db.ts`**
```typescript
import { getDb, now } from '../lib/db';

const db = getDb(c.env.DB);   // bukan drizzle(c.env.DB) langsung
const ts  = now();             // bukan Math.floor(Date.now() / 1000)
```

**`src/lib/params.ts`**
```typescript
import { parseId } from '../lib/params';

const id = parseId(c.req.param('id'));
if (!id) return c.json({ error: 'Invalid ID' }, 400);
// parseId sudah handle NaN dan <= 0
```

### Validators — wajib digunakan untuk PUT

Semua update endpoint **wajib** pakai `pick*` function dari `src/validators/` untuk mencegah mass assignment:
```typescript
import { pickUpdateExpense } from '../validators/expense';

const body  = await c.req.json();
const update = pickUpdateExpense(body);           // whitelist field saja
if (Object.keys(update).length === 0)
  return c.json({ error: 'No valid fields to update' }, 400);

await db.update(expenses).set(update).where(eq(expenses.id, id));
```

**JANGAN** langsung `.set(body)` tanpa filter — ini mass assignment dan bisa overwrite field yang tidak boleh diubah (id, monthId, createdAt, dll):
```typescript
// SALAH — mass assignment:
const body = await c.req.json();
await db.update(expenses).set(body).where(eq(expenses.id, id));

// BENAR — whitelist:
const update = pickUpdateExpense(await c.req.json());
await db.update(expenses).set(update).where(eq(expenses.id, id));
```

### 404 Guard — wajib di PUT dan DELETE

Selalu cek keberadaan row sebelum update/delete:
```typescript
const existing = await db.select().from(table).where(eq(table.id, id)).get();
if (!existing) return c.json({ error: 'Not found' }, 404);
```

### Tipe TypeScript — jangan pakai `any`

```typescript
// SALAH:
async function getSummaryData(db: any, id: number) { ... }

// BENAR:
import type { DrizzleD1Database } from 'drizzle-orm/d1';
async function getSummaryData(db: DrizzleD1Database, id: number) { ... }
```

Reduce callbacks harus punya tipe eksplisit pada accumulator:
```typescript
// SALAH:
array.reduce((s, item) => s + item.amount, 0);

// BENAR:
array.reduce((s: number, item) => s + item.amount, 0);
```

### Middleware — jangan pakai type hack

```typescript
// SALAH:
c.set('session' as never, session);

// BENAR — extend ContextVariableMap di middleware.ts:
declare module 'hono' {
  interface ContextVariableMap {
    session: Awaited<ReturnType<typeof getSession>>;
  }
}
c.set('session', session);
```

### Error Response
```typescript
// 404
return c.json({ error: 'Not found' }, 404);

// 400
return c.json({ error: 'Clear error message' }, 400);

// Success
return c.json({ ok: true });
return c.json(data);
```

### Database Queries
```typescript
const db = drizzle(c.env.DB);

// Single row
const row = await db.select().from(table).where(eq(table.id, id)).get();

// Multiple rows
const rows = await db.select().from(table).where(eq(table.monthId, monthId)).all();

// Insert with return
const result = await db.insert(table).values({ ... }).returning().get();

// Update
await db.update(table).set({ field: value }).where(eq(table.id, id));

// Delete
await db.delete(table).where(eq(table.id, id));
```

### Timestamps
Always use Unix timestamps (seconds):
```typescript
const now = Math.floor(Date.now() / 1000);
```

### Input Validation
- Parse integers with `parseInt()`, check `isNaN()`
- Parse amounts with `parseFloat()` or custom parser
- Return 400 if data is invalid

---

## Frontend (Vanilla JS)

### DOM Helper
Use the existing `el()` helper:
```javascript
const el = id => document.getElementById(id);
```

**MUST** check null before accessing properties on elements that may not exist:
```javascript
// Correct:
const x = el('some-id');
if (x) x.textContent = value;

// Wrong:
el('some-id').textContent = value;  // crashes if element missing
```

### API Calls
Use the existing `api()` helper:
```javascript
// GET
const data = await api('GET', '/months');

// POST
const result = await api('POST', '/months', { month: 1, year: 2025 });

// PUT
await api('PUT', '/months/' + id, { salary: 5000000 });

// DELETE
await api('DELETE', '/months/' + id);
```

### State
All state is stored in global object `S`. Do not create new global variables — add to `S` if needed:
```javascript
const S = {
  months, currentMonthId, summary,
  assets, expenses, investments,
  incomes, daily, projection,
  currentPage, currentTab,
  deleteConfirm, charts
};
```

### Currency Formatting
Use the `rp()` helper:
```javascript
rp(1500000)  // → "Rp1.500.000"
```

### Internationalization
Use the `t()` helper for all user-facing text:
```javascript
t('save')     // → "Simpan" (ID) or "Save" (EN)
t('noData')   // → "Tidak ada data" or "No data"
```
Add new keys in `public/i18n.js`.

### Modals
```javascript
openModal('modal-id');    // open modal
closeModal('modal-id');   // close modal
```

### Toast Notifications
```javascript
showToast('Success message', 'success');
showToast('Error message', 'error');
```

### Render Pattern
Each render function reads from state `S`:
```javascript
function renderSomething() {
  const container = el('element-id');
  if (!container) return;  // guard clause

  if (!S.data.length) {
    container.innerHTML = `<div class="empty">${t('noData')}</div>`;
    return;
  }

  container.innerHTML = S.data.map(item => `
    <div class="row">${item.name}</div>
  `).join('');
}
```

---

## CSS

### Color Variables (Dark Glassmorphism)
```css
var(--text)         /* primary text — white */
var(--text-dim)     /* secondary text — light grey */
var(--text-muted)   /* tertiary text — dark grey */
var(--bg)           /* main background */
var(--card-bg)      /* card background */
```

### Semantic Colors (hardcoded)
```css
#8fb88f   /* green — positive, safe, under budget */
#d9b877   /* yellow — warning, approaching limit */
#d98a7f   /* red — negative, over budget, danger */
```

### Glassmorphism Pattern
```css
.card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  backdrop-filter: blur(12px);
}
```

### Responsive
Use `clamp()` for responsive font sizes:
```css
font-size: clamp(14px, 3vw, 18px);
```

### No Build Step
- No Tailwind
- No preprocessors (Sass/Less)
- CSS written directly in `public/style.css`
- FontAwesome used via class: `<i class="fa-solid fa-icon-name"></i>`

---

## Naming Conventions

| Context | Convention | Example |
|---------|------------|---------|
| TypeScript variable/function | camelCase | `totalCash`, `renderHome()` |
| TypeScript type/interface | PascalCase | `Env`, `AppEnv` |
| CSS class | kebab-case | `.bva-row`, `.stat-card` |
| HTML id | kebab-case | `val-salary`, `budget-actual-list` |
| Migration file | snake_case + number | `0001_init.sql` |
| Problem-solution doc | number + kebab | `001-problem-name-en.md` |

---

## Things Never to Do

- Do not use `any` in TypeScript unless absolutely necessary — use proper type assertions
- Do not use inline styles in HTML except for dynamic JS values
- Do not add new libraries without discussion — this project is minimalist by design
- Do not leave `console.log` in production code — remove before deploying
- Do not hardcode emails or secrets in code
