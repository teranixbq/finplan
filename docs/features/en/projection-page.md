# Projection Page — FinPlan

Specification for the new "Proyeksi" (Projection) page — a dedicated view for comparing current month with next month's projections.

---

## Overview

**Proyeksi** is a standalone page (4th navigation item after Home, Setup, Daily) that displays:
- **Two-month comparison:** Selected month vs. next month
- **Budget projection:** Planned expenses for next month
- **Comparison charts:** Visual comparison of budgets, spending trends, categories
- **Editable projections:** Only when viewing the latest month

---

## Navigation Structure

### Menu Item
- **Position:** 4th item in sidebar (after Home, Setup, Daily)
- **Icon:** `<i class="fa-solid fa-chart-line"></i>` (trend chart icon)
- **Label (ID):** "Proyeksi"
- **Label (EN):** "Projection"
- **Route:** `#proyeksi` or handled by `navigate('projection')`

### Visibility
- ✅ **Always visible** in navigation
- 🔒 **Content changes** based on selected month (via top dropdown)

---

## Page Behavior by Selected Month

### Scenario A: Latest Month Selected (Editable)

**Example:** Database has July, August. User selects **August 2026** (latest).

**Display:**
- **Left column:** August 2026 Actual Data
  - Total expenses (actual from `daily_expenses`)
  - Budget breakdown by category
  - Spending vs budget comparison
  
- **Right column:** September 2026 Projection
  - Projected expenses (from `expense_projections` where `target_month = 9, target_year = 2026`)
  - Budget breakdown by category (projected)
  - Comparison with August actual

**Charts:**
1. **Budget Comparison Bar Chart**
   - X-axis: Categories (Fixed, Variable, Periodic, Tabungan)
   - Y-axis: Amount
   - Two bars per category: August Actual (blue), September Projected (green)

2. **Total Comparison**
   - Pie chart or donut chart
   - August total actual vs September total projected

3. **Trend Line Chart** (if multiple months exist)
   - X-axis: Months (June, July, August, September projected)
   - Y-axis: Total spending
   - Line shows spending trend + projected point

**Action Buttons (visible):**
- "Tambah Item" — Add new projection item
- "Samakan dengan Bulan Ini" — Reset projection to copy from August
- Edit buttons on each projection row
- Delete buttons on each projection row

**Editable:** ✅ Yes — user can add/edit/delete projections for September

---

### Scenario B: Past Month Selected (Read-Only)

**Example:** Database has July, August. User selects **July 2026** (past month).

**Display:**
- **Left column:** July 2026 Actual Data
  - Total expenses (actual from `daily_expenses` where `month_id = July`)
  - Budget breakdown by category
  - Spending vs budget comparison
  
- **Right column:** August 2026 Projection
  - Projected expenses that were created in July for August
  - Shows what user **planned** for August when they were in July
  - This is **historical projection data**, not current August actual

**Charts:**
1. **Budget Comparison Bar Chart**
   - July Actual vs August Projected (as seen from July perspective)

2. **Accuracy Chart** (NEW - unique to past months)
   - Compare: August Projected (from July) vs August Actual (real data)
   - Show projection accuracy: green if close, red if far off
   - Percentage difference per category

3. **Trend Line Chart**
   - Show July actual, August actual, August projected (from July)
   - Highlight where projection deviated from actual

**Action Buttons (hidden):**
- ❌ No "Tambah Item" button
- ❌ No "Samakan dengan Bulan Ini" button
- ❌ No Edit buttons
- ❌ No Delete buttons

**Editable:** ❌ No — pure read-only view showing historical projection vs actual

**Purpose of past month projection view:**
- **Learn from accuracy:** See how good user's projections were
- **Identify patterns:** Which categories are consistently over/under-estimated
- **Historical context:** What was planned vs what happened

---

## Data Sources

### Current Month Actual Data
```sql
-- Expenses (budget plan for current month)
SELECT * FROM expenses WHERE month_id = {currentMonthId} AND is_active = 1;

-- Actual spending (real transactions)
SELECT * FROM daily_expenses WHERE month_id = {currentMonthId};

-- Aggregate by category
SELECT 
  e.category,
  SUM(d.amount) as actual
FROM expenses e
LEFT JOIN daily_expenses d ON d.expense_id = e.id
WHERE e.month_id = {currentMonthId}
GROUP BY e.category;
```

### Next Month Projection Data
```sql
-- For latest month (editable): projections for next month
SELECT * FROM expense_projections 
WHERE user_email = {userEmail}
  AND target_month = {nextMonth}
  AND target_year = {nextYear};

-- For past month (read-only): projections that were made for the "next" month
-- Example: viewing July → show projections for August that were created when July was active
SELECT * FROM expense_projections 
WHERE user_email = {userEmail}
  AND target_month = {julys_next_month}  -- August
  AND target_year = {julys_next_year};    -- 2026
```

---

## Page Layout

### HTML Structure
```html
<div id="page-projection" class="page">
  <div class="projection-header">
    <h2 class="projection-title">
      <span id="projection-current-month">Agustus 2026</span>
      <i class="fa-solid fa-arrow-right"></i>
      <span id="projection-next-month">September 2026</span>
    </h2>
    <p class="projection-subtitle" id="projection-mode-label">
      <!-- "Edit proyeksi untuk bulan depan" or "Lihat proyeksi historis" -->
    </p>
  </div>

  <div class="projection-two-col">
    <!-- Left: Current Month Actual -->
    <div class="projection-col">
      <div class="projection-card">
        <h3 class="projection-card-title">
          <span id="projection-actual-title">Agustus 2026 — Aktual</span>
        </h3>
        
        <!-- Summary stats -->
        <div class="projection-stats">
          <div class="projection-stat">
            <span class="projection-stat-label">Total Pengeluaran</span>
            <span class="projection-stat-value" id="projection-actual-total">Rp0</span>
          </div>
          <div class="projection-stat">
            <span class="projection-stat-label">Budget</span>
            <span class="projection-stat-value" id="projection-actual-budget">Rp0</span>
          </div>
          <div class="projection-stat">
            <span class="projection-stat-label">Selisih</span>
            <span class="projection-stat-value" id="projection-actual-diff">Rp0</span>
          </div>
        </div>

        <!-- Category breakdown -->
        <div class="projection-breakdown" id="projection-actual-breakdown">
          <!-- Rendered by JS -->
        </div>

        <!-- Chart -->
        <canvas id="projection-actual-chart"></canvas>
      </div>
    </div>

    <!-- Right: Next Month Projection -->
    <div class="projection-col">
      <div class="projection-card">
        <h3 class="projection-card-title">
          <span id="projection-next-title">September 2026 — Proyeksi</span>
          <button id="btn-add-projection" class="btn btn-sm btn-primary" onclick="openModal('modal-projection')">
            <i class="fa-solid fa-plus"></i> Tambah Item
          </button>
          <button id="btn-reset-projection" class="btn btn-sm btn-ghost" onclick="resetProjection()">
            <i class="fa-solid fa-rotate"></i> Samakan dengan Bulan Ini
          </button>
        </h3>

        <!-- Summary stats -->
        <div class="projection-stats">
          <div class="projection-stat">
            <span class="projection-stat-label">Total Proyeksi</span>
            <span class="projection-stat-value" id="projection-next-total">Rp0</span>
          </div>
          <div class="projection-stat">
            <span class="projection-stat-label">Perubahan</span>
            <span class="projection-stat-value" id="projection-next-change">+Rp0</span>
          </div>
        </div>

        <!-- Projection items table -->
        <div class="projection-table-wrap">
          <table class="projection-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Kategori</th>
                <th>Dana Cair</th>
                <th>Jumlah</th>
                <th id="projection-actions-header">Aksi</th>
              </tr>
            </thead>
            <tbody id="projection-items-body">
              <!-- Rendered by JS -->
            </tbody>
          </table>
        </div>

        <!-- Chart -->
        <canvas id="projection-next-chart"></canvas>
      </div>
    </div>
  </div>

  <!-- Comparison Charts Section -->
  <div class="projection-comparison">
    <h3 class="projection-section-title">Perbandingan</h3>
    
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

    <!-- Only show accuracy chart for past months -->
    <div class="projection-chart-card" id="projection-accuracy-card" style="display:none;">
      <h4>Akurasi Proyeksi</h4>
      <p class="projection-accuracy-desc">Seberapa akurat proyeksi Anda dibanding pengeluaran aktual</p>
      <canvas id="projection-accuracy-chart"></canvas>
    </div>
  </div>
</div>
```

---

## Chart Specifications

### 1. Budget Comparison Bar Chart
**Type:** Grouped Bar Chart (Chart.js)

**Data:**
```javascript
{
  labels: ['Fixed', 'Variable', 'Periodic', 'Tabungan'],
  datasets: [
    {
      label: 'Agustus Aktual',
      data: [2000000, 1200000, 150000, 800000],
      backgroundColor: 'rgba(107, 143, 107, 0.8)', // --canopy
    },
    {
      label: 'September Proyeksi',
      data: [2000000, 1500000, 150000, 1000000],
      backgroundColor: 'rgba(143, 184, 143, 0.8)', // --canopy-bright
    }
  ]
}
```

**Options:**
- Responsive: true
- Legend position: top
- Tooltip: Show exact values in rupiah format
- Y-axis: Format as "1jt", "2jt", etc.

---

### 2. Total Comparison Donut Chart
**Type:** Doughnut Chart (Chart.js)

**Data:**
```javascript
{
  labels: ['Agustus Aktual', 'September Proyeksi'],
  datasets: [{
    data: [4150000, 4650000],
    backgroundColor: [
      'rgba(107, 143, 107, 0.8)',  // --canopy
      'rgba(143, 184, 143, 0.8)',  // --canopy-bright
    ]
  }]
}
```

**Center Text Plugin:**
- Display difference: "+Rp500.000" or "-Rp200.000"
- Color: green if increase, red if decrease

---

### 3. Accuracy Chart (Past Months Only)
**Type:** Horizontal Bar Chart

**Purpose:** Compare projected vs actual for past month

**Data:**
```javascript
{
  labels: ['Fixed', 'Variable', 'Periodic', 'Tabungan'],
  datasets: [
    {
      label: 'Proyeksi',
      data: [2000000, 1500000, 150000, 1000000],
      backgroundColor: 'rgba(143, 184, 143, 0.6)',
    },
    {
      label: 'Aktual',
      data: [2000000, 1200000, 150000, 800000],
      backgroundColor: 'rgba(107, 143, 107, 0.8)',
    }
  ]
}
```

**Additional Display:**
- Percentage difference per category
- Green badge: < 10% difference (good projection)
- Yellow badge: 10-20% difference (okay projection)
- Red badge: > 20% difference (needs improvement)

---

## TypeScript Functions

### `frontend/pages/projection.ts`
```typescript
import { S } from '../state';
import { el, rp, isLatestMonth } from '../utils';
import { t } from '../i18n';
import { MONTH_NAMES } from '../utils';

export function renderProjection(): void {
  if (!S.currentMonthId || !S.summary) return;
  
  const currentMonth = S.months.find(m => m.id === S.currentMonthId);
  if (!currentMonth) return;
  
  const isEditable = isLatestMonth(S.months, S.currentMonthId);
  const nextMonth = getNextMonth(currentMonth);
  
  // Update titles
  updateProjectionTitles(currentMonth, nextMonth, isEditable);
  
  // Render current month actual data
  renderCurrentMonthActual();
  
  // Render next month projection
  renderNextMonthProjection(nextMonth, isEditable);
  
  // Render comparison charts
  renderComparisonCharts(currentMonth, nextMonth, isEditable);
  
  // Show/hide action buttons
  updateProjectionActionButtons(isEditable);
}

function getNextMonth(current: Month): { month: number; year: number } {
  if (current.month === 12) {
    return { month: 1, year: current.year + 1 };
  }
  return { month: current.month + 1, year: current.year };
}

function updateProjectionActionButtons(isEditable: boolean): void {
  const buttons = ['btn-add-projection', 'btn-reset-projection'];
  buttons.forEach(btnId => {
    const btn = el(btnId);
    if (btn) {
      btn.style.display = isEditable ? '' : 'none';
    }
  });
  
  // Hide edit/delete buttons in table
  document.querySelectorAll('#projection-items-body .btn-icon').forEach(btn => {
    (btn as HTMLElement).style.display = isEditable ? '' : 'none';
  });
  
  // Hide actions column header if read-only
  const actionsHeader = el('projection-actions-header');
  if (actionsHeader) {
    actionsHeader.style.display = isEditable ? '' : 'none';
  }
}

function renderComparisonCharts(current: Month, next: {month: number, year: number}, isEditable: boolean): void {
  // If viewing past month, show accuracy chart
  const accuracyCard = el('projection-accuracy-card');
  if (accuracyCard) {
    accuracyCard.style.display = isEditable ? 'none' : 'block';
  }
  
  // Render charts...
  renderCategoryComparisonChart();
  renderTotalComparisonChart();
  
  if (!isEditable) {
    renderAccuracyChart(next);
  }
}
```

---

## Read-Only Mode Summary

| Element | Latest Month (Editable) | Past Month (Read-Only) |
|---------|------------------------|------------------------|
| "Tambah Item" button | ✅ Visible | ❌ Hidden |
| "Samakan dengan Bulan Ini" button | ✅ Visible | ❌ Hidden |
| Edit buttons in table | ✅ Visible | ❌ Hidden |
| Delete buttons in table | ✅ Visible | ❌ Hidden |
| Actions column header | ✅ Visible | ❌ Hidden |
| Projection data | ✅ Editable | 👁️ View-only |
| Accuracy chart | ❌ Hidden | ✅ Visible |
| Page subtitle | "Edit proyeksi untuk bulan depan" | "Proyeksi historis (read-only)" |

---

## User Flows

### Flow 1: Edit Projection (Latest Month)
1. User selects August 2026 (latest month) from dropdown
2. Navigate to "Proyeksi" page
3. See: August Actual (left) vs September Projection (right)
4. Click "Tambah Item" → Modal opens
5. Fill: Name, Category, Asset, Amount
6. Submit → New projection item added to September
7. Charts update automatically
8. Click "Samakan dengan Bulan Ini" → All September projections reset to copy August expenses

### Flow 2: View Historical Projection (Past Month)
1. User selects July 2026 (past month) from dropdown
2. Navigate to "Proyeksi" page
3. See: July Actual (left) vs August Projection (right, as planned from July)
4. See accuracy chart showing: August Projected vs August Actual
5. Identify categories with big variance (red badges)
6. No action buttons visible (read-only view)
7. Learn from projection accuracy for future planning

### Flow 3: Month Auto-Create Impact
1. User last active in August 2026
2. User logs in December 2026 (4 months later)
3. System auto-creates December 2026 (skips Sept, Oct, Nov)
4. December becomes "latest month" (editable)
5. Navigate to Proyeksi page:
   - Shows: December Actual vs January 2027 Projection
   - User can edit January 2027 projection
6. If user switches dropdown to August 2026:
   - Shows: August Actual vs September Projection (historical, read-only)
   - Accuracy chart visible (even though Sept was never actually used)

---

## CSS Classes

### Layout
- `.projection-two-col` — Two column grid (50/50 split)
- `.projection-col` — Individual column
- `.projection-card` — Card wrapper with glass effect
- `.projection-header` — Page title section
- `.projection-comparison` — Charts comparison section below

### Components
- `.projection-stats` — Summary statistics row
- `.projection-stat` — Individual stat (label + value)
- `.projection-stat-label` — Small gray text
- `.projection-stat-value` — Large emphasized value (rp format)
- `.projection-breakdown` — Category breakdown list
- `.projection-table` — Projection items table
- `.projection-chart-card` — Chart container card
- `.projection-chart-row` — Row of charts (side-by-side)

### Responsive
```css
@media (max-width: 960px) {
  .projection-two-col {
    grid-template-columns: 1fr; /* Stack vertically */
  }
  
  .projection-chart-row {
    flex-direction: column; /* Stack charts */
  }
}
```

---

## API Endpoints

### GET `/api/projections/:monthId/comparison`
Returns comparison data for projection page.

**Response:**
```json
{
  "currentMonth": {
    "id": 1,
    "month": 8,
    "year": 2026,
    "salary": 6500000,
    "totalActual": 4150000,
    "totalBudget": 4650000,
    "byCategory": {
      "fixed": { "budget": 2000000, "actual": 2000000 },
      "variable": { "budget": 1500000, "actual": 1200000 },
      "periodic": { "budget": 150000, "actual": 150000 },
      "tabungan": { "budget": 1000000, "actual": 800000 }
    }
  },
  "nextMonth": {
    "month": 9,
    "year": 2026,
    "projections": [
      {
        "id": 1,
        "name": "Kosan",
        "category": "fixed",
        "amount": 1500000,
        "assetId": 1
      },
      ...
    ],
    "totalProjected": 4650000,
    "byCategory": {
      "fixed": 2000000,
      "variable": 1500000,
      "periodic": 150000,
      "tabungan": 1000000
    }
  },
  "isEditable": true
}
```

---

## Summary

**Proyeksi page provides:**
- ✅ Clear two-month comparison view
- ✅ Visual charts for trend analysis
- ✅ Editable projections for future planning (latest month only)
- ✅ Read-only historical accuracy view (past months)
- ✅ Learn from past projection accuracy
- ✅ Consistent with FinPlan's read-only philosophy for past data

This design eliminates ambiguity by:
1. **Removing projection from Setup page** (no more confusion about which month it refers to)
2. **Always showing 2-month context** (current + next, clearly labeled)
3. **Dynamic behavior** based on selected month (editable vs read-only)
4. **Accuracy feedback** for past months (learn from mistakes)
