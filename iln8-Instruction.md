# iln8-Instruction.md — Internationalization (i18n) Guide FinPlan

---

## Overview

FinPlan supports two languages: **Indonesia (ID)** and **English (EN)**.
Default: Indonesia. User can toggle via button in navbar.

Language is stored in `localStorage` with key `fp_lang`.

---

## Main File

**`public/i18n.js`** — contains all translation keys and helper functions.

---

## Usage in JavaScript

```javascript
// Get text based on active language
t('save')        // → "Save" (EN) or "Simpan" (ID)
t('noData')      // → "No data" or "Tidak ada data"
t('totalBudget') // → "Total Budget" (same in both languages)
```

The `t()` helper is available globally in `app.js`.

---

## Usage in HTML

Add `data-i18n` attribute to elements:
```html
<span data-i18n="save">Save</span>
<button data-i18n="cancel">Cancel</button>
<th data-i18n="name">Name</th>
```

The system automatically updates text when language is switched.

---

## Adding New Keys

Edit `public/i18n.js`, add key in both languages:

```javascript
const TRANSLATIONS = {
  id: {
    // ... existing keys ...
    newKeyName: 'Teks dalam Bahasa Indonesia',
  },
  en: {
    // ... existing keys ...
    newKeyName: 'Text in English',
  }
};
```

**Key naming rules:**
- camelCase
- Descriptive and concise
- Consistent with context (e.g.: `total*`, `val*`, `btn*`)

---

## Fallback

If a key is not found in translation, `t()` returns the key itself as a string. This helps with debugging but don't leave missing keys in production.

---

## Language Toggle

Toggle button is in navbar with id `lang-toggle`. Logic in `init()` in `app.js`:

```javascript
el('lang-toggle').addEventListener('click', () => {
  const next = (localStorage.getItem('fp_lang') || 'id') === 'id' ? 'en' : 'id';
  setLang(next);
  el('lang-toggle').textContent = next.toUpperCase();
});
```

The `setLang(lang)` function updates all `[data-i18n]` elements at once.

---

## Bilingual Documentation

All files in the `docs/` folder are available in two versions:
- `filename-id.md` — Bahasa Indonesia
- `filename-en.md` — English

When updating documentation, **always update both versions** to keep them in sync.
