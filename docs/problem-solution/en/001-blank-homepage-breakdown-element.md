# 001 — Blank Homepage: Null Reference on Deleted Element

**Date:** 2025-07
**Severity:** Critical (page cannot render at all)
**Status:** Resolved

---

## Problem Description

FinPlan homepage shows a blank page. No data is displayed — summary grid, income card, BVA chart, all blank. The Setup tab also fails to show saved asset/expense data.

---

## Root Cause

In `public/app.js`, the `renderHome()` function contained a code block referencing the HTML element `breakdown-content`:

```javascript
// app.js — renderHome(), line ~315
const bEl = el('breakdown-content');
const activeExp = S.expenses.filter(e => e.isActive && e.category !== 'daily');
if (!activeExp.length) {
  bEl.innerHTML = `...`;  // ← CRASH: bEl is null
}
```

The `#breakdown-content` element was previously removed from `index.html` when the "Expense Breakdown" feature was removed from the homepage. However, the JS block referencing that element **was not removed**.

Result: `el('breakdown-content')` returns `null`, and `bEl.innerHTML = ...` throws `TypeError: Cannot set properties of null`. This error occurs mid-`renderHome()`, stopping execution before:
- Summary grid values are populated
- `renderCharts()` is called
- `renderIncomes()` is called
- `renderSetup()` is also affected because it's called after `renderHome()` from `loadMonthData()`

---

## Why This Matters

This is a pattern that can recur: every time an HTML element is deleted from `index.html`, any reference in `app.js` that uses `el('element-id')` and directly accesses its properties (without a null check) will crash.

The `el()` function is a wrapper around `document.getElementById()` which returns `null` if the element is not found. There is no built-in error handling.

---

## Solution

Remove the JS block referencing the element that no longer exists in the DOM:

```javascript
// BEFORE (crashes):
const bEl = el('breakdown-content');
const activeExp = S.expenses.filter(e => e.isActive && e.category !== 'daily');
if (!activeExp.length) {
  bEl.innerHTML = `<div class="breakdown-row total">...</div>`;
} else {
  bEl.innerHTML = activeExp.map(e => `...`).join('') + `...`;
}

// AFTER (removed entirely):
// — nothing —
```

---

## Lessons & Best Practices

1. **Always search for references before deleting an HTML element.** Before removing an `id` from HTML, grep it in `app.js`:
   ```bash
   grep -n "element-id" public/app.js
   ```

2. **Use optional chaining for DOM access.** For elements that may not always exist:
   ```javascript
   // Safe:
   const bEl = el('breakdown-content');
   if (bEl) bEl.innerHTML = `...`;

   // Or:
   el('breakdown-content')?.innerHTML = `...`;
   ```

3. **One JS error can blank the entire page.** `renderHome()` is not wrapped in try/catch, so one TypeError stops all rendering. Consider adding error boundaries:
   ```javascript
   function renderHome() {
     try {
       // ... render logic
     } catch (e) {
       console.error('renderHome error:', e);
     }
   }
   ```

4. **Check `renderHome()` every time the homepage HTML structure changes.**
