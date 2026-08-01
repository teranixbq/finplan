// ============================================================
// frontend/pages/setup.ts — setup page render functions
// ============================================================

import { S } from '../services/state';
import { el, rp, CAT_ICON, CAT_ICON_COLOR, MONTH_NAMES } from '../helpers/utils';
import { t } from '../helpers/i18n';

export function renderSetup(): void {
  renderSalary();
  renderAssets();
  renderInvestments();
  renderExpenses();
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
  if (!tbody) return;
  if (!S.assets.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty">${t('noData')}</td></tr>`;
    return;
  }
  tbody.innerHTML = S.assets
    .map(
      (a) => `
    <tr>
      <td data-label="Nama">${a.name}</td>
      <td data-label="Nominal" style="text-align:right">${rp(a.amount)}</td>
      <td class="td-actions"><button class="btn-icon danger" onclick="window.deleteAsset(${a.id})"><i class="fa-solid fa-trash"></i></button></td>
    </tr>
  `,
    )
    .join('');
}

export function renderInvestments(): void {
  const tbody = el('investments-body');
  if (!tbody) return;
  if (!S.investments.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">${t('noData')}</td></tr>`;
    return;
  }
  tbody.innerHTML = S.investments
    .map(
      (inv) => `
    <tr>
      <td data-label="Nama">${inv.name}</td>
      <td data-label="Tipe">${t(inv.type)}</td>
      <td data-label="Nominal" style="text-align:right">${rp(inv.amount)}</td>
      <td class="td-actions"><button class="btn-icon danger" onclick="window.deleteInvestment(${inv.id})"><i class="fa-solid fa-trash"></i></button></td>
    </tr>
  `,
    )
    .join('');
}

export function renderExpenses(): void {
  const tbody = el('expenses-body');
  if (!tbody) return;
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
      <td data-label="Nama">${exp.name}${periodNote}</td>
      <td data-label="Kategori">${t(exp.category)}</td>
      <td data-label="Sumber">${assetName}</td>
      <td data-label="Nominal" style="text-align:right">${rp(exp.amount)}</td>
      <td data-label="Aktif">
        <button class="toggle-btn ${exp.isActive ? 'active' : 'inactive'}" onclick="window.toggleExpense(${exp.id}, ${exp.isActive})">
          ${exp.isActive ? t('active') : t('inactive')}
        </button>
      </td>
      <td class="td-actions"><button class="btn-icon danger" onclick="window.deleteExpense(${exp.id})"><i class="fa-solid fa-trash"></i></button></td>
    </tr>`;
    })
    .join('');
}
