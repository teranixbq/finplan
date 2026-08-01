# Implementation Plan — Month Auto-Creation & Proyeksi Page

Implementation guide for month lifecycle improvements and new Proyeksi page based on updated requirements.

---

## Overview

This implementation adds:
1. **Auto-create month on login** with smart skip behavior
2. **"Bulan Baru" button visibility logic** (only for first-time users)
3. **New "Proyeksi" page** for two-month budget comparison
4. **Enhanced read-only mode** for past months
5. **Salary edit restrictions** (only editable in latest month)

---

## Phase 1: Month Auto-Creation Logic

### Backend Changes

#### 1.1. Update `src/routes/months.ts`

**Add function: `checkAndAutoCreateMonth()`**

```typescript
async function checkAndAutoCreateMonth(c: Context<{ Bindings: Env }>): Promise<void> {
  const db = getDb(c.env.DB);
  
  // Get all months
  const allMonths = await db.select().from(months).orderBy(months.year, months.month);
  
  if (allMonths.length === 0) {
    // First-time user — no auto-create needed
    return;
  }
  
  const latestMonth = allMonths[allMonths.length - 1];
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();
  
  // Check if current real-world month is ahead
  const latestYearMonth = latestMonth.year * 100 + latestMonth.month;
  const currentYearMonth = currentYear * 100 + currentMonth;
  
  if (currentYearMonth > latestYearMonth) {
    // Auto-create needed
    await autoCreateMonth(c, currentMonth, currentYear, latestMonth);
  }
}

async function autoCreateMonth(
  c: Context<{ Bindings: Env }>,
  targetMonth: number,
  targetYear: number,
  sourceMonth: typeof months.$inferSelect
): Promise<void> {
  const db = getDb(c.env.DB);
  const nowTimestamp = now();
  
  // 1. Create new month
  const [newMonth] = await db.insert(months).values({
    month: targetMonth,
    year: targetYear,
    salary: sourceMonth.salary,
    salaryDate: sourceMonth.salaryDate,
    createdAt: nowTimestamp,
  }).returning();
  
  // 2. Copy active expenses
  const sourceExpenses = await db
    .select()
    .from(expenses)
    .where(eq(expenses.monthId, sourceMonth.id))
    .where(eq(expenses.isActive, 1));
  
  for (const exp of sourceExpenses) {
    await db.insert(expenses).values({
      monthId: newMonth.id,
      assetId: exp.assetId,
      name: exp.name,
      category: exp.category,
      amount: exp.amount,
      periodMonths: exp.periodMonths,
      periodType: exp.periodType,
      isActive: 1,
    });
  }
  
  // 3. Copy investments
  const sourceInvestments = await db
    .select()
    .from(investments)
    .where(eq(investments.monthId, sourceMonth.id));
  
  for (const inv of sourceInvestments) {
    await db.insert(investments).values({
      monthId: newMonth.id,
      name: inv.name,
      type: inv.type,
      amount: inv.amount,
    });
  }
  
  // 4. Assets are global — no copy needed
  // 5. incomes, daily_expenses start empty
}
```

**Call in GET `/api/months` endpoint:**

```typescript
app.get('/', async (c) => {
  // Check and auto-create month if needed
  await checkAndAutoCreateMonth(c);
  
  // Then return months as usual
  const db = getDb(c.env.DB);
  const allMonths = await db.select().from(months).orderBy(months.year, months.month);
  return c.json(allMonths);
});
```

**Files to modify:**
- `src/routes/months.ts` — Add auto-create functions, call in GET endpoint
- `src/lib/db.ts` — Already has `getDb()` and `now()` helpers

---

### Frontend Changes

#### 1.2. Update `frontend/data.ts`

**Add `shouldShowNewMonthButton()` helper:**

```typescript
export function shouldShowNewMonthButton(): boolean {
  return S.months.length === 0;
}
```

**Update `loadMonths()` to control button visibility:**

```typescript
export async function loadMonths(): Promise<void> {
  S.months = await getMonths(); // This will trigger auto-create on backend
  S.months.sort((a, b) => a.year * 100 + a.month - (b.year * 100 + b.month));

  // Control "Bulan Baru" button visibility
  const btnNewMonth = el('btn-new-month');
  if (btnNewMonth) {
    btnNewMonth.style.display = shouldShowNewMonthButton() ? '' : 'none';
  }

  if (!S.months.length) {
    el('no-month').classList.remove('hidden');
    document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
    document.querySelector('.main-wrap')?.classList.add('empty-mode');
    return;
  }

  el('no-month').classList.add('hidden');
  document.querySelector('.main-wrap')?.classList.remove('empty-mode');

  const activePage = document.querySelector('.page.active');
  if (!activePage) el('page-' + S.currentPage)?.classList.add('active');

  if (!S.currentMonthId || !S.months.find((m) => m.id === S.currentMonthId)) {
    S.currentMonthId = S.months[S.months.length - 1].id;
  }

  populateMonthSelect();
  await loadMonthData();
}
```

**Files to modify:**
- `frontend/data.ts` — Add helper, update `loadMonths()`

---

## Phase 2: Salary Edit Restrictions

### Frontend Changes

#### 2.1. Update `frontend/pages/setup.ts`

**Add check before showing "Edit Gaji" button:**

```typescript
export function renderSalary(): void {
  const s = S.summary;
  if (!s) return;
  const salaryEl = el('setup-salary-value');
  if (salaryEl) salaryEl.textContent = rp(s.month.salary);
  const salaryDateEl = el('setup-salarydate-value');
  if (salaryDateEl) salaryDateEl.textContent = `Tgl ${s.month.salaryDate}`;
  
  // Show/hide edit button based on whether this is latest month
  const isEditable = isLatestMonth(S.months, S.currentMonthId);
  const btnEditSalary = el('btn-open-salary');
  if (btnEditSalary) {
    btnEditSalary.style.display = isEditable ? '' : 'none';
  }
}
```

**Note:** `updateReadOnlyMode()` in `data.ts` already handles hiding `btn-open-salary`, but adding explicit check in `renderSalary()` provides redundancy.

**Files to modify:**
- `frontend/pages/setup.ts` — Update `renderSalary()`

---

## Phase 3: New Proyeksi Page

### Frontend Changes

#### 3.1. Create `frontend/pages/projection.ts`

```typescript
import { S } from '../state';
import { el, rp, isLatestMonth, MONTH_NAMES } from '../utils';
import { t } from '../i18n';

declare const Chart: any;

export function renderProjection(): void {
  if (!S.currentMonthId || !S.summary || !S.projection) return;
  
  const currentMonth = S.months.find(m => m.id === S.currentMonthId);
  if (!currentMonth) return;
  
  const isEditable = isLatestMonth(S.months, S.currentMonthId);
  const nextMonth = getNextMonth(currentMonth);
  
  updateProjectionTitles(currentMonth, nextMonth, isEditable);
  renderCurrentMonthActual();
  renderNextMonthProjection(nextMonth, isEditable);
  renderComparisonCharts(currentMonth, nextMonth, isEditable);
  updateProjectionActionButtons(isEditable);
}

function getNextMonth(current: { month: number; year: number }): { month: number; year: number } {
  if (current.month === 12) {
    return { month: 1, year: current.year + 1 };
  }
  return { month: current.month + 1, year: current.year };
}

function updateProjectionTitles(
  current: { month: number; year: number },
  next: { month: number; year: number },
  isEditable: boolean
): void {
  const titleCurrent = el('projection-current-month');
  const titleNext = el('projection-next-month');
  const modeLabel = el('projection-mode-label');
  
  if (titleCurrent) titleCurrent.textContent = `${MONTH_NAMES[current.month - 1]} ${current.year}`;
  if (titleNext) titleNext.textContent = `${MONTH_NAMES[next.month - 1]} ${next.year}`;
  if (modeLabel) {
    modeLabel.textContent = isEditable 
      ? t('projectionEditable') || 'Edit proyeksi untuk bulan depan'
      : t('projectionReadOnly') || 'Proyeksi historis (read-only)';
  }
}

function renderCurrentMonthActual(): void {
  // Render actual data from S.summary
  // Aggregate by category, display in left column
  // Implementation similar to existing home.ts renderBVA()
}

function renderNextMonthProjection(next: { month: number; year: number }, isEditable: boolean): void {
  // Render projection data from S.projection
  // Display in table format with edit/delete buttons if editable
}

function renderComparisonCharts(
  current: { month: number; year: number },
  next: { month: number; year: number },
  isEditable: boolean
): void {
  // Render category comparison chart
  // Render total comparison chart
  // If !isEditable, render accuracy chart
}

function updateProjectionActionButtons(isEditable: boolean): void {
  ['btn-add-projection', 'btn-reset-projection'].forEach(btnId => {
    const btn = el(btnId);
    if (btn) btn.style.display = isEditable ? '' : 'none';
  });
  
  document.querySelectorAll('#projection-items-body .btn-icon').forEach(btn => {
    (btn as HTMLElement).style.display = isEditable ? '' : 'none';
  });
  
  const actionsHeader = el('projection-actions-header');
  if (actionsHeader) actionsHeader.style.display = isEditable ? '' : 'none';
  
  const accuracyCard = el('projection-accuracy-card');
  if (accuracyCard) accuracyCard.style.display = isEditable ? 'none' : 'block';
}
```

**Files to create:**
- `frontend/pages/projection.ts` — New file with render functions

#### 3.2. Update `frontend/navigation.ts`

**Add proyeksi to navigation logic:**

```typescript
export function navigate(page: string): void {
  S.currentPage = page;
  
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  
  el('page-' + page)?.classList.add('active');
  document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');
  
  const titleEl = el('page-title');
  if (titleEl) titleEl.textContent = t(page);
  
  if (page === 'home') {
    requestAnimationFrame(() => renderCharts(S.summary));
  } else if (page === 'setup') {
    renderSetup();
  } else if (page === 'daily') {
    renderDaily();
  } else if (page === 'projection') {
    renderProjection(); // NEW
  }
}
```

**Files to modify:**
- `frontend/navigation.ts` — Add `projection` case

#### 3.3. Update `frontend/main.ts`

**Import and expose renderProjection:**

```typescript
import { renderProjection } from './pages/projection';

// Add to window interface
declare global {
  interface Window {
    // ... existing
    renderProjection: typeof renderProjection;
  }
}

window.renderProjection = renderProjection;
```

**Files to modify:**
- `frontend/main.ts` — Import and expose `renderProjection`

#### 3.4. Update `frontend/index.html`

**Add navigation item (after Daily):**

```html
<button class="nav-item" data-page="projection" onclick="navigate('projection')">
  <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
  </svg>
  <span data-i18n="projection">Proyeksi</span>
</button>
```

**Add page container (after page-daily):**

```html
<div id="page-projection" class="page">
  <div class="projection-header">
    <h2 class="projection-title">
      <span id="projection-current-month">-</span>
      <i class="fa-solid fa-arrow-right"></i>
      <span id="projection-next-month">-</span>
    </h2>
    <p class="projection-subtitle" id="projection-mode-label">-</p>
  </div>

  <div class="projection-two-col">
    <!-- Left: Current Month Actual -->
    <div class="projection-col">
      <div class="projection-card">
        <h3 class="projection-card-title">
          <span id="projection-actual-title">Bulan Ini — Aktual</span>
        </h3>
        <div class="projection-stats">
          <div class="projection-stat">
            <span class="projection-stat-label">Total Pengeluaran</span>
            <span class="projection-stat-value" id="projection-actual-total">Rp0</span>
          </div>
        </div>
        <div class="projection-breakdown" id="projection-actual-breakdown"></div>
        <canvas id="projection-actual-chart"></canvas>
      </div>
    </div>

    <!-- Right: Next Month Projection -->
    <div class="projection-col">
      <div class="projection-card">
        <h3 class="projection-card-title">
          <span id="projection-next-title">Bulan Depan — Proyeksi</span>
          <button id="btn-add-projection" class="btn btn-sm btn-primary" onclick="openModal('modal-projection')">
            <i class="fa-solid fa-plus"></i> Tambah Item
          </button>
        </h3>
        <div class="projection-table-wrap">
          <table class="projection-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Kategori</th>
                <th>Jumlah</th>
                <th id="projection-actions-header">Aksi</th>
              </tr>
            </thead>
            <tbody id="projection-items-body"></tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <div class="projection-comparison">
    <h3>Perbandingan</h3>
    <div class="projection-chart-row">
      <div class="projection-chart-card">
        <h4>Budget per Kategori</h4>
        <canvas id="projection-comparison-category-chart"></canvas>
      </div>
      <div class="projection-chart-card">
        <h4>Total Pengeluaran</h4>
        <canvas id="projection-comparison-total-chart"></canvas>
      </div>
    </div>
    <div class="projection-chart-card" id="projection-accuracy-card" style="display:none;">
      <h4>Akurasi Proyeksi</h4>
      <canvas id="projection-accuracy-chart"></canvas>
    </div>
  </div>
</div>
```

**Files to modify:**
- `frontend/index.html` — Add nav item, add page container

#### 3.5. Update `frontend/style.css`

**Add projection page styles:**

```css
/* ============================================
   PROJECTION PAGE
   ============================================ */
.projection-header {
  text-align: center;
  margin-bottom: 32px;
}

.projection-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.projection-subtitle {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 8px;
}

.projection-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 32px;
}

.projection-col {
  min-width: 0;
}

.projection-card {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  padding: 24px;
}

.projection-card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.projection-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.projection-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.projection-stat-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.projection-stat-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--canopy-bright);
}

.projection-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 16px;
}

.projection-table th,
.projection-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--glass-border);
}

.projection-table th {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.projection-comparison {
  margin-top: 48px;
}

.projection-chart-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-top: 24px;
}

.projection-chart-card {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  padding: 24px;
}

.projection-chart-card h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 16px;
}

/* Responsive */
@media (max-width: 960px) {
  .projection-two-col,
  .projection-chart-row {
    grid-template-columns: 1fr;
  }
}
```

**Files to modify:**
- `frontend/style.css` — Add projection styles

#### 3.6. Update `frontend/i18n.ts`

**Add translation keys:**

```typescript
// Indonesian
projection: 'Proyeksi',
projectionEditable: 'Edit proyeksi untuk bulan depan',
projectionReadOnly: 'Proyeksi historis (read-only)',
projectionActual: 'Aktual',
projectionProjected: 'Proyeksi',
projectionChange: 'Perubahan',
projectionAccuracy: 'Akurasi Proyeksi',
projectionAccuracyDesc: 'Seberapa akurat proyeksi Anda dibanding pengeluaran aktual',

// English
projection: 'Projection',
projectionEditable: 'Edit projection for next month',
projectionReadOnly: 'Historical projection (read-only)',
projectionActual: 'Actual',
projectionProjected: 'Projected',
projectionChange: 'Change',
projectionAccuracy: 'Projection Accuracy',
projectionAccuracyDesc: 'How accurate your projections compared to actual spending',
```

**Files to modify:**
- `frontend/i18n.ts` — Add new keys

---

### Backend Changes (Optional Enhancement)

#### 3.7. Create `src/routes/projections.ts` (Optional)

**Add comparison endpoint:**

```typescript
import { Hono } from 'hono';
import { getDb } from '../lib/db';
import { eq } from 'drizzle-orm';
import type { Env } from '../auth';

const app = new Hono<{ Bindings: Env }>();

app.get('/:monthId/comparison', async (c) => {
  const monthId = parseInt(c.req.param('monthId'));
  const db = getDb(c.env.DB);
  
  // Get current month data
  // Get projection data
  // Calculate comparison
  // Return JSON
  
  return c.json({
    currentMonth: { /* ... */ },
    nextMonth: { /* ... */ },
    isEditable: true,
  });
});

export default app;
```

**Mount in `src/index.ts`:**

```typescript
import projections from './routes/projections';
app.route('/api/projections', projections);
```

**Files to create/modify:**
- `src/routes/projections.ts` (new)
- `src/index.ts` (modify to mount route)

**Note:** This is optional. Projection data can also be calculated entirely on frontend from existing API responses.

---

## Phase 4: Remove Projection from Setup Page

### Frontend Changes

#### 4.1. Update `frontend/index.html`

**Remove projection tab from Setup page:**

Delete the `<button class="tab-btn" data-tab="projection">` and `<div id="tab-projection" class="tab-content">` sections.

**Files to modify:**
- `frontend/index.html` — Remove projection tab from setup

#### 4.2. Update `frontend/pages/setup.ts`

**Remove `renderProjection()` function** (if it exists in setup.ts).

**Files to modify:**
- `frontend/pages/setup.ts` — Remove projection render logic

---

## Testing Checklist

### Month Auto-Creation
- [ ] First-time user: "Bulan Baru" button visible
- [ ] After first month created: "Bulan Baru" button hidden
- [ ] User with August 2026 logs in December 2026: December auto-created, Sept/Oct/Nov skipped
- [ ] Auto-created month inherits salary, expenses, investments from previous month
- [ ] Assets remain global (not duplicated)

### Salary Edit
- [ ] Latest month: "Edit Gaji" button visible and functional
- [ ] Past month: "Edit Gaji" button hidden
- [ ] Editing salary in latest month updates only that month

### Proyeksi Page
- [ ] Navigation shows 4th item "Proyeksi"
- [ ] Latest month: Shows current vs next, edit buttons visible
- [ ] Past month: Shows past vs next, edit buttons hidden, accuracy chart visible
- [ ] Charts render correctly (category comparison, total comparison, accuracy)
- [ ] Responsive layout works on mobile (columns stack vertically)

### Read-Only Mode
- [ ] Past month: All action buttons hidden (Catat Harian, Tambah Pemasukan, Tambah Asset, Edit Gaji, etc.)
- [ ] Latest month: All action buttons visible
- [ ] Switching between months updates button visibility correctly

---

## Deployment Steps

1. **Commit documentation changes:**
   ```bash
   git add docs/
   git commit -m "docs: add month lifecycle and projection page specs"
   git push
   ```

2. **Implement Phase 1 (Month Auto-Creation):**
   - Backend: `src/routes/months.ts`
   - Frontend: `frontend/data.ts`
   - Test locally with `npm run dev`
   - Commit: `git commit -m "feat: implement month auto-creation on login"`

3. **Implement Phase 2 (Salary Edit Restrictions):**
   - Frontend: `frontend/pages/setup.ts`, `frontend/data.ts`
   - Test: Verify edit button visibility
   - Commit: `git commit -m "feat: restrict salary edit to latest month only"`

4. **Implement Phase 3 (Proyeksi Page):**
   - Create: `frontend/pages/projection.ts`
   - Update: `frontend/index.html`, `frontend/navigation.ts`, `frontend/main.ts`, `frontend/style.css`, `frontend/i18n.ts`
   - Test: Full page functionality
   - Commit: `git commit -m "feat: add new Proyeksi page with two-month comparison"`

5. **Implement Phase 4 (Remove Projection from Setup):**
   - Update: `frontend/index.html`, `frontend/pages/setup.ts`
   - Test: Verify projection removed from setup
   - Commit: `git commit -m "refactor: move projection from setup to dedicated page"`

6. **Push to production:**
   ```bash
   git push origin main
   ```
   Cloudflare will auto-deploy.

7. **Verify production:**
   - Visit `finplan.apicode.my.id`
   - Test all features in checklist
   - Check browser console for errors
   - Test on mobile device

---

## Rollback Plan

If issues occur in production:

1. **Revert commits:**
   ```bash
   git revert HEAD~4..HEAD  # Revert last 4 commits
   git push origin main
   ```

2. **Database rollback (if needed):**
   - If auto-created months cause issues, manually delete via D1 console:
   ```sql
   DELETE FROM months WHERE created_at > [timestamp_before_deploy];
   ```
   - Cascade delete will remove related expenses, investments

3. **Frontend-only rollback:**
   - If only frontend issues, revert frontend files only:
   ```bash
   git revert [commit-hash] -- frontend/
   git push
   ```

---

## Future Enhancements (Out of Scope)

- **Projection accuracy insights:** ML-based suggestions for better projections
- **Bulk month creation:** UI to manually create multiple months at once
- **Projection templates:** Save and reuse projection patterns
- **Projection vs actual dashboard:** Historical accuracy trends over 6-12 months
- **Email reminders:** Notify user when new month auto-created
- **Undo month creation:** Soft-delete with restore capability

---

## References

- Architecture: `docs/architecture/en/schema.md`
- Business Logic: `docs/business-logic/en/calculations.md`, `docs/business-logic/en/month-lifecycle.md`
- Features: `docs/features/en/projection-page.md`
- Code Conventions: `CODERULES.md`
- Agent Rules: `AGENT.md`
