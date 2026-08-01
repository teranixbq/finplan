# Month Lifecycle — FinPlan

How months are created, managed, and transitioned in FinPlan.

---

## Overview

FinPlan uses a **lazy auto-creation** strategy for months:
- User creates the **first month manually** via "Bulan Baru" button
- After first month exists, **subsequent months are created automatically** when user logs in
- If user skips multiple months (doesn't login), those months are **not created** — system jumps to current month

---

## First-Time Setup

### Trigger
User has **zero months** in database (`SELECT COUNT(*) FROM months WHERE 1` returns 0).

### UI Behavior
- "Bulan Baru" button is **visible** in top bar
- No month data is displayed (empty state message shown)
- User must click "Bulan Baru" to begin

### User Actions
1. Click "Bulan Baru"
2. Fill in initial setup:
   - Month & Year (e.g., August 2026)
   - Salary amount (e.g., Rp6,500,000)
   - Salary date (default: 28)
   - Initial assets (BCA, Gopay, etc.)
   - Initial expenses budget
3. Submit → First month created

### After First Month Created
- "Bulan Baru" button **permanently hidden** (never shown again)
- Month dropdown populated with first month
- Home, Setup, Daily, and Proyeksi pages become active

---

## Auto-Create Month (Subsequent Months)

### Trigger
User logs in and system detects **current real-world month is ahead** of the latest month in database.

### Detection Logic
```typescript
const latestMonth = months[months.length - 1]; // e.g., { month: 8, year: 2026 }
const now = new Date();
const currentMonth = now.getMonth() + 1; // 1-12
const currentYear = now.getFullYear();

// Compare: is real-world month ahead?
const latestYearMonth = latestMonth.year * 100 + latestMonth.month; // 202608
const currentYearMonth = currentYear * 100 + currentMonth;           // 202612

if (currentYearMonth > latestYearMonth) {
  // Auto-create needed
  autoCreateMonth(currentMonth, currentYear, latestMonth);
}
```

### Skip Month Behavior

**Example scenario:**
```
Latest month in DB: August 2026 (2026-08)
Current real-world: December 2026 (2026-12)
Gap: September, October, November (3 months)
```

**Action:**
- **Skip** September, October, November entirely (do not create DB rows)
- Create **only December 2026** with data inherited from August 2026

**Rationale:**
- User was inactive for 3 months → no financial activity occurred
- Creating empty months adds no value and clutters database
- Assets carryover directly from August to December
- Expenses/investments copied from August to December

### Data Inheritance on Auto-Create

When creating December 2026 from August 2026:

| Field | Source | Logic |
|-------|--------|-------|
| `salary` | August 2026 | Copy exact value unless user edits later |
| `salary_date` | August 2026 | Copy exact value |
| `expenses` | August 2026 | Copy all active expenses (WHERE `is_active = 1`) |
| `investments` | August 2026 | Copy all investments |
| `assets` | Global (real-time) | Assets are already global — no copy needed |
| `incomes` | None | Start empty (user adds manually) |
| `daily_expenses` | None | Start empty (user adds manually) |

### Assets Carryover

Assets are **global** (no `month_id`), so their balance is always real-time.

When December 2026 is created, assets are **not duplicated**. They continue to exist with their current balance.

**Historical context:**
- August 2026 ended with BCA balance: Rp5,000,000
- User didn't login for 3 months (Sept, Oct, Nov)
- December 2026 created → BCA balance is **still Rp5,000,000** (no transactions occurred)
- If user had transactions in September before going inactive, those would already be recorded in August or September (but since no months existed, no transactions could have been recorded)

**Note:** This design assumes financial activity **requires** an active month to exist. If user doesn't login for 3 months, no transactions are recorded during that gap.

---

## Month Transition Logic

### When User Logs In

**Step 1: Check if auto-create needed**
```typescript
async function checkAndCreateMonth(c: Context) {
  const months = await getMonths(); // Fetch all months
  if (months.length === 0) {
    // First-time user — show "Bulan Baru" button
    return { needsFirstSetup: true };
  }
  
  const latestMonth = months[months.length - 1];
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  
  if (needsAutoCreate(latestMonth, currentMonth, currentYear)) {
    await autoCreateMonth(currentMonth, currentYear, latestMonth);
  }
  
  return { needsFirstSetup: false };
}
```

**Step 2: Auto-create month**
```typescript
async function autoCreateMonth(
  targetMonth: number,
  targetYear: number,
  sourceMonth: Month
) {
  const db = getDb(c.env.DB);
  const now = nowUnix();
  
  // 1. Create new month row
  const [newMonth] = await db.insert(months).values({
    month: targetMonth,
    year: targetYear,
    salary: sourceMonth.salary,           // Copy from source
    salaryDate: sourceMonth.salaryDate,   // Copy from source
    createdAt: now,
  }).returning();
  
  // 2. Copy expenses from source month
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
  
  // 3. Copy investments from source month
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
  
  // 4. Assets are global — no action needed
  // 5. incomes, daily_expenses start empty — no action needed
  
  return newMonth;
}
```

---

## Edit Rules by Month Type

### Latest Month (Current)
**Example:** User is viewing August 2026, and August is the latest month in DB.

| Action | Allowed? |
|--------|----------|
| Edit salary | ✅ Yes |
| Edit salary date | ✅ Yes |
| Add/Edit/Delete expenses | ✅ Yes |
| Add/Edit/Delete investments | ✅ Yes |
| Add income | ✅ Yes |
| Add daily expense | ✅ Yes |
| Edit projection for next month | ✅ Yes |

**UI:** All action buttons visible.

### Past Month (Read-Only)
**Example:** User is viewing July 2026, but August 2026 exists (August is latest).

| Action | Allowed? |
|--------|----------|
| Edit salary | ❌ No (read-only) |
| Edit salary date | ❌ No (read-only) |
| Add/Edit/Delete expenses | ❌ No (buttons hidden) |
| Add/Edit/Delete investments | ❌ No (buttons hidden) |
| Add income | ❌ No (button hidden) |
| Add daily expense | ❌ No (button hidden) |
| View projection | 👁️ Read-only (see Juli→Agustus comparison) |

**UI:** All action buttons hidden (`display: none`). Data is view-only.

**Rationale:**
- Past months are **historical records**
- Editing past months would corrupt financial timeline
- If user needs to correct past data, they should do it **before creating next month**

---

## "Bulan Baru" Button Visibility

```typescript
function shouldShowNewMonthButton(months: Month[]): boolean {
  return months.length === 0;
}
```

- ✅ **Visible:** When `months.length === 0` (first-time setup)
- ❌ **Hidden:** When `months.length > 0` (after first month exists)

**Reason for permanent hiding:**
- Subsequent months are created **automatically on login**
- User should never need to manually create months after first setup
- Prevents confusion and accidental duplicate month creation

---

## Edge Cases

### User Creates Month in Future
**Example:** User manually creates September 2026 while still in August 2026.

**Current behavior:** Not possible — "Bulan Baru" button is hidden after first month.

**If implemented in future:**
- System would treat September as "latest month"
- August becomes read-only
- User can edit September freely

**Recommendation:** Do not allow future month creation. Keep months tied to real-world calendar.

### User Deletes Latest Month
**Example:** User deletes August 2026. July 2026 becomes latest month.

**Expected behavior:**
- July becomes editable again
- Next login: System detects August needed, auto-creates August from July
- UI switches from read-only to editable for "current" month

**Implementation note:** Month deletion should be carefully considered — may break financial timeline. Consider adding confirmation dialog: "Deleting latest month will revert to previous month. Continue?"

### Database Has Gaps (Manual Deletion)
**Example:** Database has July 2026 and October 2026, but August-September deleted.

**Current auto-create logic:** Would detect October as latest, no action needed.

**Recommendation:** Add data integrity check on app init to detect and warn about gaps in month sequence. Gaps can cause confusion in reports and projections.

---

## Summary

| Phase | Trigger | Action | Button State |
|-------|---------|--------|--------------|
| **First-time** | `months.length === 0` | User clicks "Bulan Baru" | ✅ Visible |
| **Subsequent** | Login, current month > latest month | Auto-create current month | ❌ Hidden |
| **Active month** | Viewing latest month | User can edit freely | ✅ Actions visible |
| **Past month** | Viewing older month | Read-only, no edits | ❌ Actions hidden |
| **Skip months** | Login after 3-month gap | Skip gap, create current only | ❌ Hidden |

This design ensures:
- **Simple onboarding:** One-time "Bulan Baru" setup
- **Zero maintenance:** Months create automatically
- **Clean database:** No empty gap months
- **Data integrity:** Past months are immutable
- **Clear UX:** Latest month is always editable, past is always read-only
