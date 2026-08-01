# 004 — Field Name Mismatch: `totalIncome` vs `totalIncomes`

**Date:** 2026-08
**Severity:** Medium (income amount always shows Rp0 on homepage)
**Status:** Resolved

---

## Problem Description

The "Incoming Income" card on the homepage always showed `Rp0` even when income data existed. Additionally, a stray `-` character appeared below the amount with no purpose.

---

## Root Cause

### 1. Field name mismatch

In `frontend/pages/home.ts:57`, the code used `s.totalIncome`:

```typescript
if (salaryEl) salaryEl.textContent = rp(s.totalIncome || 0);
```

But in `src/shared/types.ts:92`, the field is defined as `totalIncomes` (with a trailing `s`):

```typescript
totalIncomes: number;
```

Because TypeScript strict mode did not catch this (the field resolved as `undefined`), the expression `s.totalIncome || 0` always returned `0` → displayed as `Rp0`.

### 2. Stray `-` character

In `index.html` there was an element:

```html
<div class="income-sub" id="income-sub">-</div>
```

This element was never populated by `home.ts` (no reference to `income-sub` in JS), so the `-` character rendered statically with no purpose.

---

## Solution

### 1. Fix field name in `home.ts`

```typescript
// Before
if (salaryEl) salaryEl.textContent = rp(s.totalIncome || 0);

// After
if (salaryEl) salaryEl.textContent = rp(s.totalIncomes || 0);
```

### 2. Remove `income-sub` element from `index.html`

```html
<!-- Before -->
<div class="income-amount" id="val-salary">Rp0</div>
<div class="income-sub" id="income-sub">-</div>

<!-- After -->
<div class="income-amount" id="val-salary">Rp0</div>
```

---

## Rules (Lessons Learned)

1. **Always cross-check field names between `src/shared/types.ts` and `frontend/`** — `types.ts` is the source of truth for API response field names. Verify with:
   ```bash
   grep -n "totalIncome\b" frontend/pages/home.ts src/shared/types.ts
   ```

2. **Remove unused HTML elements** — elements with `id` attributes not referenced in JS should be removed to avoid confusion.

3. **Use TypeScript strict mode consistently** — enable `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` to catch non-existent field access at compile time.

---

## Related Commits

- `0bce6ab` — fix: totalIncome -> totalIncomes field name, remove income-sub strip
