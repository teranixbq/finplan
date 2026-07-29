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
