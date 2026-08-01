# 005 — Toggle Switch: Active/Inactive Expenses

**Date:** 2026-08
**Severity:** Low (UX improvement, not a critical bug)
**Status:** Resolved

---

## Problem Description

The active/inactive button on the expenses table in the Setup page previously used plain text buttons (e.g. "Deactivate" / "Activate"). This:

1. Was not visually consistent with modern toggle patterns
2. Occupied more column width than necessary
3. Did not provide intuitive visual feedback for active/inactive state

---

## Solution

Replace the text button with a **CSS toggle switch** — a checkbox styled as an on/off switch.

### HTML Pattern

```html
<label class="toggle-switch">
  <input
    type="checkbox"
    class="toggle-input"
    data-id="${expense.id}"
    ${expense.isActive ? 'checked' : ''}
  />
  <span class="toggle-slider"></span>
</label>
```

### CSS Implementation

```css
/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  cursor: pointer;
}

.toggle-input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 22px;
  transition: background 0.2s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  left: 3px;
  top: 3px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle-input:checked + .toggle-slider {
  background: var(--accent);
}

.toggle-input:checked + .toggle-slider::before {
  transform: translateX(18px);
}
```

### JavaScript Event Handler

```typescript
// Event listener in setup.ts
el('expense-table')?.addEventListener('change', async (e) => {
  const input = e.target as HTMLInputElement;
  if (!input.classList.contains('toggle-input')) return;
  const id = Number(input.dataset.id);
  const isActive = input.checked;
  await api.patch(`/expenses/${id}`, { isActive });
  await reloadData();
});
```

---

## Design Decisions

| Aspect | Decision |
|--------|----------|
| Width | 40px — sufficient touch target for mobile |
| Active color | `var(--accent)` — consistent with global accent color |
| Inactive color | `rgba(255, 255, 255, 0.15)` — subtle, fits glassmorphism |
| Transition | 0.2s — fast enough, not too slow |
| Border-radius | 22px (pill shape) — consistent with `--radius-lg` spirit |

---

## Rules (Lessons Learned)

1. **Use toggle switch for all boolean state columns in tables** — more intuitive than text buttons, saves column width.

2. **Toggle switch naming convention:**
   - Container: `.toggle-switch`
   - Input: `.toggle-input` (with `data-id`)
   - Slider: `.toggle-slider`
   - Do not create different class names for other toggle components — reuse the same classes to avoid CSS duplication.

3. **Event delegation** — attach a single `addEventListener('change')` to the table container, not per-row, to avoid memory leaks when the table re-renders.

4. **Accessibility** — a `<label>` wrapping `<input type="checkbox">` is sufficient for screen readers. No additional `aria-label` needed if the container context is clear.

---

## Related Commits

- `df2cba5` — feat: toggle switch CSS for active/inactive expenses
