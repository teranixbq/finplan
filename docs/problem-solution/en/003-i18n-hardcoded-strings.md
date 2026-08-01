# 003 — i18n: Hardcoded Indonesian Strings Not Switching on Language Change

**Date:** 2026-08
**Severity:** Medium (language switch feature not fully working)
**Status:** Resolved

---

## Problem Description

When the user switched language to English, some UI text remained in Indonesian. These strings were hardcoded directly in HTML/TypeScript instead of going through the `t()` function or `data-i18n` attributes.

---

## List of Affected Strings

### `index.html`

| Location | String | Should Be |
|----------|--------|-----------|
| tooltip title | `"Lihat detail perhitungan"` | `data-i18n-title="seeDetail"` |
| daily section title | `Rincian Pemasukan` | `data-i18n="incomeSection"` |
| input placeholder | `"Nama investasi"` | `data-i18n-placeholder="placeholderInvName"` |
| input placeholder | `"Nama pengeluaran"` (3x) | `data-i18n-placeholder="placeholderExpName/ProjName/DailyName"` |
| input placeholder | `"Catatan..."` | `data-i18n-placeholder="placeholderNote"` |
| select option | `Bulan` | `data-i18n="periodMonthOption"` |
| select option | `- Pilih Sumber -` | `data-i18n="chooseSource"` |

### `pages/home.ts`

| Location | String | Should Be |
|----------|--------|-----------|
| BVA footer | `'Over Budget'` | `t('overBudget')` |
| BVA footer | `'Sisa Budget'` | `t('remainingBudget')` |

### `pages/setup.ts` and `pages/projection.ts`

| Location | String | Should Be |
|----------|--------|-----------|
| `data-label` on `<td>` | `"Nama"`, `"Nominal"`, `"Kategori"`, `"Sumber"`, `"Tipe"`, `"Aktif"` | `data-label="${t('name')}"`, etc. |

---

## Root Cause

No clear rule existed that **all UI strings must go through `t()`**. Developers added strings directly to template literals or HTML without going through the i18n system, and these passed unnoticed during review.

`data-label` on `<td>` was ignored because it was assumed to only be used for CSS mobile styling (pseudo-element `::before`), when in fact it is still visible text that should be translatable.

---

## Solution

### 1. Add new keys to `i18n.ts` (ID + EN)

```typescript
// Indonesian
overBudget: 'Over Budget',
remainingBudget: 'Sisa Budget',
incomeSection: 'Rincian Pemasukan',
seeDetail: 'Lihat detail perhitungan',
chooseSource: '- Pilih Sumber -',
placeholderInvName: 'Nama investasi',
placeholderExpName: 'Nama pengeluaran',
placeholderProjName: 'Nama pengeluaran',
placeholderDailyName: 'Nama pengeluaran',
placeholderNote: 'Catatan...',
periodMonthOption: 'Bulan',

// English
overBudget: 'Over Budget',
remainingBudget: 'Remaining Budget',
incomeSection: 'Income Details',
seeDetail: 'See calculation detail',
chooseSource: '- Choose Source -',
placeholderInvName: 'Investment name',
placeholderExpName: 'Expense name',
placeholderProjName: 'Expense name',
placeholderDailyName: 'Expense name',
placeholderNote: 'Note...',
periodMonthOption: 'Month',
```

### 2. Update `index.html`

```html
<!-- Before -->
<span class="section-title">Rincian Pemasukan</span>
<input placeholder="Nama investasi">
<option value="">- Pilih Sumber -</option>

<!-- After -->
<span class="section-title" data-i18n="incomeSection">Rincian Pemasukan</span>
<input data-i18n-placeholder="placeholderInvName" placeholder="Nama investasi">
<option data-i18n="chooseSource">- Pilih Sumber -</option>
```

### 3. Update `home.ts`

```typescript
// Before
const selisihLabel = overBudget ? 'Over Budget' : 'Sisa Budget';

// After
const selisihLabel = overBudget ? t('overBudget') : t('remainingBudget');
```

### 4. Update `data-label` in `setup.ts` and `projection.ts`

```typescript
// Before
<td data-label="Nama">${a.name}</td>
<td data-label="Nominal">${rp(a.amount)}</td>

// After
<td data-label="${t('name')}">${a.name}</td>
<td data-label="${t('amount')}">${rp(a.amount)}</td>
```

---

## Rules (Lessons Learned)

1. **All UI strings must go through `t()`** — no Indonesian or English strings may be hardcoded directly in template literals or HTML without `data-i18n`.

2. **`data-label` on `<td>` must also be i18n** — on mobile it renders as a visible label via CSS `content: attr(data-label)`.

3. **Input placeholders must use `data-i18n-placeholder`** — the `setLang()` system already supports this.

4. **How to audit hardcoded strings:**
   ```bash
   # Find Indonesian strings in TS files
   grep -rn "'[A-Z][a-zA-Z ]*'" frontend/pages/ | grep -v "t('\|data-i18n\|//"

   # Find hardcoded placeholders in HTML
   grep -n "placeholder=" frontend/index.html | grep -v "data-i18n-placeholder"

   # Find hardcoded data-label in TS
   grep -rn 'data-label="[A-Z]' frontend/pages/
   ```

5. **When adding a new key to `id:`** — always add the English equivalent to `en:` in the same commit.

---

## Related Commits

- `5974193` — i18n: add new keys, fix hardcoded Indonesian strings across all pages
