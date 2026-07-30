// ============================================================
// frontend/pages/setup.ts — setup page render functions
// ============================================================

import { S } from '../state';
import { el, rp, CAT_ICON, CAT_ICON_COLOR, MONTH_NAMES } from '../utils';
import { t } from '../i18n';

export function renderSetup(): void {
  renderSalary();
  renderAssets();
  renderInvestments();
  renderExpenses();
  renderProjection();
}

export function renderSalary(): void {
  const s = S.summary;
  if (!s) return;
  const salaryEl = el('setup-salary-value');
  if (salaryEl) salaryEl.textContent = rp(s.month.salary);
  const salaryDateEl = el('setup-salarydate-value');
  if (salaryDateEl) salaryDateEl.textContent = `Tgl ${s.month.salaryDate}`;
}

export function renderAssets(): void {
  const tbody = el('assets-body');
  if (!S.assets.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty">${t('noData')}</td></tr>`;
    return;
  }
  tbody.innerHTML = S.assets
    .map(
      (a) => `
    <tr>
      <td>${a.name}</td>
      <td style="text-align:right">${rp(a.amount)}</td>
      <td><button class="btn-icon danger" onclick="window.deleteAsset(${a.id})">${t('delete')}</button></td>
    </tr>
  `,
    )
    .join('');
}

export function renderInvestments(): void {
  const tbody = el('investments-body');
  if (!S.investments.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">${t('noData')}</td></tr>`;
    return;
  }
  tbody.innerHTML = S.investments
    .map(
      (inv) => `
    <tr>
      <td>${inv.name}</td>
      <td>${t(inv.type)}</td>
      <td style="text-align:right">${rp(inv.amount)}</td>
      <td><button class="btn-icon danger" onclick="window.deleteInvestment(${inv.id})">${t('delete')}</button></td>
    </tr>
  `,
    )
    .join('');
}

export function renderExpenses(): void {
  const tbody = el('expenses-body');
  if (!S.expenses.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">${t('noData')}</td></tr>`;
    return;
  }
  tbody.innerHTML = S.expenses
    .map((exp) => {
      const assetName = S.assets.find((a) => a.id === exp.assetId)?.name || '-';
      let periodNote = '';
      if (exp.category === 'periodic' && exp.periodMonths) {
        periodNote = ` <span class="badge">${exp.periodMonths}x/${exp.periodType === 'year' ? 'thn' : 'bln'}</span>`;
      }
      return `<tr>
      <td>${exp.name}${periodNote}</td>
      <td>${t(exp.category)}</td>
      <td>${assetName}</td>
      <td style="text-align:right">${rp(exp.amount)}</td>
      <td>
        <button class="toggle-btn ${exp.isActive ? 'active' : 'inactive'}" onclick="window.toggleExpense(${exp.id}, ${exp.isActive})">
          ${exp.isActive ? t('active') : t('inactive')}
        </button>
      </td>
      <td><button class="btn-icon danger" onclick="window.deleteExpense(${exp.id})">${t('delete')}</button></td>
    </tr>`;
    })
    .join('');
}

export function renderProjection(): void {
  const tbody = el('projection-body');
  if (!tbody) return;
  const proj = S.projection;
  const items = proj?.items || [];

  const tgt = proj?.target;
  const lbl = el('proj-target-label');
  if (lbl) lbl.textContent = tgt ? `${MONTH_NAMES[tgt.month - 1]} ${tgt.year}` : '-';

  const total = items.reduce((s: number, i) => s + i.amount, 0);
  const totalEl = el('proj-total');
  if (totalEl) totalEl.textContent = rp(total);

  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty">${t('noProjection')}</td></tr>`;
    return;
  }
  tbody.innerHTML = items
    .map((it) => {
      const assetName = S.assets.find((a) => a.id === it.assetId)?.name || '-';
      return `<tr>
      <td><span class="bd-left"><span class="bd-icon" style="color:${CAT_ICON_COLOR[it.category] || ''}">${CAT_ICON[it.category] || ''}</span><span>${it.name}</span></span></td>
      <td>${t(it.category)}</td>
      <td>${assetName}</td>
      <td style="text-align:right">${rp(it.amount)}</td>
      <td class="row-actions">
        <button class="btn-icon" onclick="window.editProjection(${it.id})">${t('edit')}</button>
        <button class="btn-icon danger" onclick="window.deleteProjection(${it.id})">${t('delete')}</button>
      </td>
    </tr>`;
    })
    .join('');
}
