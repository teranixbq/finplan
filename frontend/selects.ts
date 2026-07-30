// ============================================================
// frontend/selects.ts — populate select dropdowns
// ============================================================

import { S } from './state';
import { el, rp } from './utils';
import { t } from './i18n';
import { MONTH_NAMES } from './utils';

export function populateMonthSelect(): void {
  const select = el('month-select') as HTMLSelectElement;
  if (!select) return;
  const currentVal = S.currentMonthId;
  select.innerHTML = '';
  [...S.months].reverse().forEach((m) => {
    const opt = document.createElement('option');
    opt.value = String(m.id);
    opt.textContent = `${MONTH_NAMES[m.month - 1]} ${m.year}`;
    if (m.id === currentVal) opt.selected = true;
    select.appendChild(opt);
  });
}

export function populateAssetSelects(): void {
  const opts = S.assets
    .map((a) => `<option value="${a.id}">${a.name} (${rp(a.amount)})</option>`)
    .join('');
  const emptyOpt = `<option value="">- Pilih -</option>`;

  const expAsset = el('exp-asset');
  if (expAsset) expAsset.innerHTML = emptyOpt + opts;

  const incAsset = el('inc-asset');
  if (incAsset) incAsset.innerHTML = `<option value="">- Pilih Sumber -</option>` + opts;

  const projAsset = el('proj-asset');
  if (projAsset) projAsset.innerHTML = emptyOpt + opts;
}

export function populateDailyExpenseSelect(): void {
  const opts = S.expenses
    .filter((e) => e.isActive)
    .map((e) => `<option value="${e.id}" data-amount="${e.amount}">${e.name}</option>`)
    .join('');
  const sel = el('daily-expense-ref');
  if (sel) sel.innerHTML = `<option value="">Manual</option>` + opts;
}
