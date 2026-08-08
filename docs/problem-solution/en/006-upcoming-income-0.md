# 006 — Upcoming Income Always Rp0

## 📝 Problem Description
The "Pemasukan Mendatang" (Upcoming Income) card on the Home page displays `Rp0` even though the user has a configured salary (e.g., Rp6,500,000). The status badge also incorrectly shows "KRITIS" (Critical) because the value is evaluated as zero.

## 🔍 Root Cause
In `frontend/pages/home.ts`, the `val-salary` element (Upcoming Income card) was assigned the value of `s.totalIncomes`:
```typescript
if (salaryEl) salaryEl.textContent = rp(s.totalIncomes || 0);
```
The variable `s.totalIncomes` represents the accumulation from the `incomes` table (additional incomes already recorded for that month). Since there are usually no additional incomes recorded at the start of the month, its value is 0.

However, conceptually, "Upcoming Income" refers to the **main salary** (`salary`) that *will* be received on the payday (usually the 28th), not the accumulated additional income that has already been recorded.

## 💡 Solution
Change the value reference displayed on the "Upcoming Income" card from `totalIncomes` to `month.salary`.

**Before (frontend/pages/home.ts):**
```typescript
const salaryEl = el('val-salary');
if (salaryEl) salaryEl.textContent = rp(s.totalIncomes || 0);
```

**After (frontend/pages/home.ts):**
```typescript
const salaryEl = el('val-salary');
if (salaryEl) salaryEl.textContent = rp(s.month.salary);
```

## 🎓 Lessons Learned / New Rules
1. **Data Concept Understanding:** `totalIncomes` (from the `incomes` table) represents *actual additional* income that has already occurred. "Upcoming Income" is the *planned/projected salary* (`salary` from the `months` table). Do not mix actuals with plans.
2. **Label Consistency:** If the UI label is "Upcoming Income", ensure the fetched data represents a future funding source, not a recapitulation of past data (unless used for estimation).
