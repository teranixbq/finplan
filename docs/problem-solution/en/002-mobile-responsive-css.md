# 002 — Mobile Responsive CSS: Media Query Conflicts & Broken Layout

**Date:** 2026-08
**Severity:** High (broken UI on mobile, no crash)
**Status:** Resolved

---

## Problem Description

Several mobile UI issues found simultaneously:

1. **Income table desktop** — "Name" column not visible at all on desktop
2. **Income table mobile** — "Date" and "Amount" headers still visible, should only show "Name"
3. **Amount font too large** in mobile income table (28px, should be 12px)
4. **Projection section** — two cards (plan + compare) had different widths on desktop
5. **Projection section header cramped** on mobile — title + 2 buttons didn't wrap
6. **Container padding** too large on mobile
7. **All delete buttons** still showing text, not trash icon

---

## Root Cause

### 1. Income table media query conflict (main issue)

There were **two different media queries** controlling income table classes:

```css
/* @media (max-width: 768px) — line 1172 */
.income-cell-main { display: table-cell; }       /* ACTIVE on mobile */
.income-desktop { display: none !important; }

/* @media (max-width: 600px) — line 1484 (DUPLICATE) */
.income-cell-main { display: table-cell !important; }
.income-desktop { display: none !important; }
```

Inconsistent breakpoints (600px vs 768px) caused conflicts and neither block reliably controlled desktop behavior.

### 2. Class name collision: `.income-amount`

The `.income-amount` class was used in **two different places**:

```css
/* Stat card on homepage — large font */
.income-amount { font-size: 28px; font-weight: 800; }

/* Row in income table — should be small */
/* no separate CSS → overridden by stat card style */
```

In `daily.ts`, income table rows also rendered `<span class="income-amount">` — picked up the 28px style from the stat card.

### 3. `proj-compare-wrap` had `max-width: 860px`

```css
.proj-compare-wrap {
  max-width: 860px;   /* ← this caused the width difference */
  margin: 0 auto;
}
```

While `.proj-plan-wrap` had no `max-width` (full width). This made two sibling cards render at different widths.

### 4. No Name column in desktop income table

Income table row HTML structure:

```html
<!-- income-cell-main: contains name — but hidden on desktop -->
<td class="income-cell-main">...</td>
<!-- income-desktop: no Name column -->
<td class="income-cell-date income-desktop">Date</td>
<td class="income-cell-amount income-desktop">Amount</td>
<td class="income-cell-action income-desktop">Action</td>
```

No Name column existed for desktop.

---

## Solution

### 1. Remove duplicate `@media (max-width: 600px)`, consolidate into `768px`

```css
/* Remove the entire @media (max-width: 600px) block for income */
/* Move all styles into the existing @media (max-width: 768px) block */
```

### 2. Separate desktop and mobile thead in `index.html`

```html
<thead class="income-thead-desktop"><tr>
  <th>Name</th>
  <th>Date</th>
  <th>Amount</th>
  <th></th>
</tr></thead>
<thead class="income-thead-mobile"><tr>
  <th>Name</th>
</tr></thead>
```

CSS:
```css
/* Default desktop */
.income-thead-mobile { display: none; }
.income-thead-desktop { display: table-header-group; }

/* Mobile */
@media (max-width: 768px) {
  .income-thead-desktop { display: none !important; }
  .income-thead-mobile { display: table-header-group !important; }
}
```

### 3. Add Name column to desktop row in `daily.ts`

```typescript
// Before: no Name column for desktop
// After:
<td class="income-cell-name income-desktop">${inc.name}</td>
<td class="income-cell-date income-desktop">${dateStr}</td>
<td class="income-cell-amount income-desktop" style="text-align:right">${rp(inc.amount)}</td>
<td class="income-cell-action income-desktop">...</td>
<td class="income-cell-main">...</td>  <!-- mobile only -->
```

### 4. Rename row class `income-amount` to `income-row-amount`

```typescript
// daily.ts — income table row
// Before:
<span class="income-amount">${rp(inc.amount)}</span>
// After:
<span class="income-row-amount">${rp(inc.amount)}</span>
```

CSS:
```css
/* Inside @media (max-width: 768px) */
.income-row-amount { font-size: 12px; font-weight: 600; color: var(--canopy-bright); }
```

### 5. Remove `max-width` from `.proj-compare-wrap`

```css
/* Before */
.proj-compare-wrap { padding: 20px; max-width: 860px; margin: 0 auto; }

/* After */
.proj-compare-wrap { padding: 20px; }
```

### 6. Standardize CSS variables for radius + mobile card padding

```css
/* Before */
--radius: 12px;
--radius-lg: 22px;

/* After — more proportional */
--radius: 10px;
--radius-lg: 16px;
```

Mobile card padding:
```css
@media (max-width: 768px) {
  .card { padding: 14px 16px; }
  .section-header { flex-wrap: wrap; gap: 8px; }
  .proj-plan-actions { width: 100%; justify-content: flex-start; }
}
```

### 7. Replace all delete buttons with trash icon

```typescript
// Before
<button class="btn-icon danger">${t('delete')}</button>

// After
<button class="btn-icon danger"><i class="fa-solid fa-trash"></i></button>
```

---

## Rules (Lessons Learned)

1. **Only one mobile breakpoint: `768px`** — no `@media (max-width: 600px)` for mobile allowed.

2. **Never reuse class names across different components** — e.g. `.income-amount` in stat card vs table row. Use specific names: `.income-row-amount`, `.income-stat-amount`.

3. **Separate desktop/mobile thead** for tables with different layouts — use `income-thead-desktop` and `income-thead-mobile`.

4. **All sibling card containers must be the same width** — avoid `max-width` on cards placed side by side, unless at page container level.

5. **CSS radius variables must be consistent** — all cards/tables use `var(--radius)` or `var(--radius-lg)`, no hardcoded pixel values.

---

## Related Commits

- `3e078cc` — trash icons, income desktop fix, proj/setup containers
- `bd0bc0e` — income table desktop name column + projection layout
- `7e564eb` — proj-compare-wrap remove max-width
- `c83d992` — separate desktop/mobile thead income table
- `5de82ec` — rename income-amount to income-row-amount
- `e731eb3` — reduce global radius, smaller mobile card padding, section-header wrap
