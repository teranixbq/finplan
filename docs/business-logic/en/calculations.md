# Business Logic — Financial Calculations FinPlan

File: `src/routes/months.ts` — function `GET /:id/summary`

---

## Core Concept

FinPlan distinguishes two types of expense data:

| Type | Source | Purpose |
|------|--------|---------|
| **Budget** | `expenses` table | Planned spending, used for BVA comparison |
| **Actual** | `daily_expenses` table | Real spending that has occurred |

---

## Summary Calculation Formula

### Liquid Funds (Dana Cair)
```
totalCash = SUM(assets.amount)
```
Real-time balance of all liquid accounts (BCA, Gopay, Cash, etc.). Not a snapshot — always current value.

### Total Investment
```
totalInvestment = SUM(investments.amount) WHERE month_id = currentMonth
```

### Total Actual Spending (Daily)
```
totalDaily = SUM(daily_expenses.amount) WHERE month_id = currentMonth
```
Includes ALL recorded expenses — both those linked to an expense template (`expense_id` not null) and manual ones (`expense_id` null).

### Remaining Before Payday ⭐
```
sisaSebelumGajian = (totalCash + totalInvestment) - totalDaily
```
**Logic:** All funds currently owned minus actual spending that has occurred. Investments are included because they represent part of the user's total wealth, even if not immediately liquid.

### End of Month Remaining (Estimate)
```
sisaAkhirBulan = sisaSebelumGajian + month.salary
```
Estimated financial condition after salary is received at month end.

---

## Budget Breakdown

For category purposes, budget is calculated from `expenses` where `is_active = 1`:

```
totalFixed    = SUM(expenses.amount) WHERE category = 'fixed'    AND is_active = 1
totalVariable = SUM(expenses.amount) WHERE category = 'variable' AND is_active = 1
totalPeriodic = SUM(expenses.amount) WHERE category = 'periodic' AND is_active = 1
totalTabungan = SUM(expenses.amount) WHERE category = 'tabungan' AND is_active = 1
totalBudget   = totalFixed + totalVariable + totalPeriodic + totalTabungan
```

**Note:** `totalBudget` is the **planned** spending for this month. This figure is **not** used in `sisaSebelumGajian` calculation — only for BVA comparison.

---

## Budget vs Actual (BVA)

Displayed as a horizontal progress bar per expense item.

**Aggregate actual per expense:**
```javascript
actualMap[expenseId] = SUM(daily_expenses.amount) WHERE expense_id = expenseId
```

**Per item:**
```
budget  = expenses.amount
actual  = actualMap[expenses.id] || 0
pct     = actual / budget * 100

barColor:
  pct >= 100 → red    (#d98a7f) — over budget
  pct >= 80  → yellow (#d9b877) — warning
  pct < 80   → green  (#8fb88f) — safe
```

**BVA Footer:**
```
totalActual (BVA) = SUM(actualMap values)  ← only those linked to expense template
totalBudget       = SUM(expenses.amount)
selisih           = totalBudget - totalActual
```

**Important:** `totalActual` in BVA footer ≠ `totalDaily`. BVA only counts daily expenses linked to an expense template (`expense_id != null`). Manual daily expenses don't appear in BVA but still count toward `sisaSebelumGajian`.

---

## New Month Carryover

When user creates a new month, the system automatically:

1. **Copies expenses** from the previous month to the new month
2. **Updates asset balances** with carryover formula:
   ```
   carryover = asset.amount + totalIn - totalOut
   asset.amount = MAX(0, carryover)
   ```
   Where `totalIn` = last month's incomes for that asset, `totalOut` = last month's active expenses for that asset.

---

## Expense Categories

| Category | Description | Examples |
|----------|-------------|---------|
| `fixed` | Fixed monthly expenses | Installments, rent |
| `variable` | Variable expenses | Food, transport |
| `periodic` | Periodic expenses (not every month) | Annual subscriptions |
| `tabungan` | Savings | Emergency fund, saving goals |

**Note:** There is no `daily` category in the `expenses` table. `daily_expenses` is a separate table for actual spending log.

---

## Breakdown Modal (UI)

When user clicks the ℹ️ icon on a summary card:

**Remaining Before Payday:**
```
Liquid Funds       : totalCash
+ Investments      : totalInvestment
──────────────────────────────────
Total Funds        : totalCash + totalInvestment

- Linked to Budget : SUM(daily where expense_id != null)
- Manual           : SUM(daily where expense_id == null)
──────────────────────────────────
- Total Spending   : totalDaily

= Remaining Before Payday: sisaSebelumGajian
```

**End of Month Remaining:**
```
Remaining Before Payday: sisaSebelumGajian
+ Salary               : month.salary
──────────────────────────────────
= Estimated Month End  : sisaAkhirBulan
```

---

## Average Daily Spending

```
avgDailyExpense = totalDaily / number_of_unique_days_with_transactions
```
Not divided by calendar days — only days that actually have transactions.

---

## Projection Comparison (Proyeksi Page)

The **Proyeksi** page provides two-month comparison for budget planning and accuracy analysis.

### Data Sources

**Current Month (Left Column):**
```
actualByCategory = {
  fixed: SUM(daily_expenses.amount) WHERE expense.category = 'fixed' AND expense.monthId = currentMonth,
  variable: SUM(daily_expenses.amount) WHERE expense.category = 'variable' AND expense.monthId = currentMonth,
  periodic: SUM(daily_expenses.amount) WHERE expense.category = 'periodic' AND expense.monthId = currentMonth,
  tabungan: SUM(daily_expenses.amount) WHERE expense.category = 'tabungan' AND expense.monthId = currentMonth
}

budgetByCategory = {
  fixed: SUM(expenses.amount) WHERE category = 'fixed' AND monthId = currentMonth AND isActive = 1,
  variable: SUM(expenses.amount) WHERE category = 'variable' AND monthId = currentMonth AND isActive = 1,
  periodic: SUM(expenses.amount) WHERE category = 'periodic' AND monthId = currentMonth AND isActive = 1,
  tabungan: SUM(expenses.amount) WHERE category = 'tabungan' AND monthId = currentMonth AND isActive = 1
}
```

**Next Month Projection (Right Column):**
```
projectionByCategory = {
  fixed: SUM(expense_projections.amount) WHERE category = 'fixed' AND targetMonth = nextMonth AND targetYear = nextYear,
  variable: SUM(expense_projections.amount) WHERE category = 'variable' AND targetMonth = nextMonth AND targetYear = nextYear,
  periodic: SUM(expense_projections.amount) WHERE category = 'periodic' AND targetMonth = nextMonth AND targetYear = nextYear,
  tabungan: SUM(expense_projections.amount) WHERE category = 'tabungan' AND targetMonth = nextMonth AND targetYear = nextYear
}
```

### Comparison Calculations

**Total Change:**
```
totalProjected = SUM(projectionByCategory)
totalActual = SUM(actualByCategory)
change = totalProjected - totalActual
changePercent = (change / totalActual) * 100
```

**Category-wise Change:**
```
FOR EACH category IN ['fixed', 'variable', 'periodic', 'tabungan']:
  categoryChange[category] = projectionByCategory[category] - actualByCategory[category]
  categoryChangePercent[category] = (categoryChange[category] / actualByCategory[category]) * 100
```

### Projection Accuracy (Past Months Only)

When viewing a **past month**, the projection accuracy is calculated by comparing:
- **Projected:** What was planned for next month (from `expense_projections`)
- **Actual:** What actually happened in next month (from `daily_expenses`)

```
FOR EACH category:
  projected = projectionByCategory[category]  // Historical projection data
  actual = nextMonthActualByCategory[category]  // Real data from next month
  
  accuracy[category] = {
    projected: projected,
    actual: actual,
    diff: actual - projected,
    diffPercent: ((actual - projected) / projected) * 100,
    status: 
      if abs(diffPercent) < 10 then 'good'
      else if abs(diffPercent) < 20 then 'okay'
      else 'needs-improvement'
  }
```

**Accuracy Badges:**
- 🟢 **Good:** < 10% difference (projection was accurate)
- 🟡 **Okay:** 10-20% difference (acceptable variance)
- 🔴 **Needs Improvement:** > 20% difference (projection was off)

### Editable vs Read-Only

**Latest Month (Editable):**
- User can add/edit/delete projections for next month
- Comparison shows: Current month actual vs Next month projection (can be modified)
- Purpose: Plan for upcoming month

**Past Month (Read-Only):**
- User cannot edit historical projections
- Comparison shows: Past month actual vs Next month projection (historical data)
- Additional: Accuracy chart comparing historical projection vs actual outcome
- Purpose: Learn from projection accuracy, identify patterns

### Example Scenario

**Viewing August 2026 (latest month):**
```
Left: August 2026 Actual
  Fixed: Rp2,000,000 (actual spending)
  Variable: Rp1,200,000 (actual spending)
  Total: Rp4,150,000

Right: September 2026 Projection (editable)
  Fixed: Rp2,000,000 (user can edit)
  Variable: Rp1,500,000 (user can edit)
  Total: Rp4,650,000

Change: +Rp500,000 (+12.0%)
```

**Viewing July 2026 (past month):**
```
Left: July 2026 Actual
  Fixed: Rp1,800,000 (historical data)
  Variable: Rp1,000,000 (historical data)
  Total: Rp3,800,000

Right: August 2026 Projection (read-only, created in July)
  Fixed: Rp2,000,000 (cannot edit)
  Variable: Rp1,500,000 (cannot edit)
  Total: Rp4,500,000

Accuracy Chart:
  Fixed: Projected Rp2,000,000 → Actual Rp2,000,000 (0% diff) 🟢
  Variable: Projected Rp1,500,000 → Actual Rp1,200,000 (-20% diff) 🔴
  
Insight: Variable expenses were overestimated by 20%. 
Consider adjusting future variable projections downward.
```

---

## Summary of All Calculations

| Metric | Formula | Purpose |
|--------|---------|---------|
| `totalCash` | SUM(assets.amount) | Real-time liquid funds |
| `totalInvestment` | SUM(investments.amount) | Current month investments |
| `totalDaily` | SUM(daily_expenses.amount) | Actual spending this month |
| `totalBudget` | SUM(expenses.amount WHERE isActive=1) | Planned budget this month |
| `sisaSebelumGajian` | (totalCash + totalInvestment) - totalDaily | Remaining before payday |
| `sisaAkhirBulan` | sisaSebelumGajian + salary | Estimated month-end balance |
| `avgDailyExpense` | totalDaily / days_with_transactions | Average daily spend rate |
| `projectionChange` | totalProjected - totalActual | Budget change next month |
| `projectionAccuracy` | (actual - projected) / projected * 100 | Projection accuracy % |

**Data Integrity Rules:**
- Budget (`expenses`) ≠ Actual (`daily_expenses`) — these are separate and must not be confused
- Assets are global — always real-time, not per-month snapshots
- Past months are read-only — no edits allowed to preserve financial timeline
- Projections are per-user and per-target-month — stored in `expense_projections` table

See `docs/features/en/projection-page.md` for detailed UI specifications.
