// ============================================================
// frontend/data.ts — data loading functions (replaces loadMonths/loadMonthData/reloadAll)
// ============================================================

import { S } from './state';
import { el, isLatestMonth } from './utils';
import {
  getMonths,
  getSummary,
  getAssets,
  getExpenses,
  getInvestments,
  getIncomes,
  getDaily,
  getProjection,
} from './api';
import { renderHome } from './pages/home';
import { renderSetup } from './pages/setup';
import { renderDaily } from './pages/daily';
import { populateAssetSelects, populateDailyExpenseSelect, populateMonthSelect } from './selects';

export async function loadMonths(): Promise<void> {
  S.months = await getMonths();
  S.months.sort((a, b) => a.year * 100 + a.month - (b.year * 100 + b.month));

  if (!S.months.length) {
    el('no-month').classList.remove('hidden');
    document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
    document.querySelector('.main-wrap')?.classList.add('empty-mode');
    return;
  }

  el('no-month').classList.add('hidden');
  document.querySelector('.main-wrap')?.classList.remove('empty-mode');

  const activePage = document.querySelector('.page.active');
  if (!activePage) el('page-' + S.currentPage)?.classList.add('active');

  if (!S.currentMonthId || !S.months.find((m) => m.id === S.currentMonthId)) {
    S.currentMonthId = S.months[S.months.length - 1].id;
  }

  populateMonthSelect();
  await loadMonthData();
}

export async function loadMonthData(): Promise<void> {
  if (!S.currentMonthId) return;
  populateMonthSelect();

  const [summary, assets, expenses, investments, incomes, daily, projection] = await Promise.all([
    getSummary(S.currentMonthId),
    getAssets(),
    getExpenses(S.currentMonthId),
    getInvestments(S.currentMonthId),
    getIncomes(S.currentMonthId),
    getDaily(S.currentMonthId),
    getProjection(S.currentMonthId),
  ]);

  S.summary = summary;
  S.assets = assets;
  S.expenses = expenses;
  S.investments = investments;
  S.incomes = incomes;
  S.daily = daily;
  S.projection = projection;

  renderHome();
  renderSetup();
  renderDaily();
  populateAssetSelects();
  populateDailyExpenseSelect();
  updateReadOnlyMode();
}

function updateReadOnlyMode(): void {
  const isEditable = isLatestMonth(S.months, S.currentMonthId);
  
  // Disable/enable all add buttons
  const addButtons = [
    'btn-add-income',
    'btn-add-daily',
    'btn-add-asset',
    'btn-add-expense',
    'btn-add-investment',
  ];
  
  addButtons.forEach(btnId => {
    const btn = el(btnId);
    if (btn) {
      if (isEditable) {
        btn.removeAttribute('disabled');
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
      } else {
        btn.setAttribute('disabled', 'true');
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
      }
    }
  });
  
  // Disable/enable all delete buttons in tables
  document.querySelectorAll('.btn-icon.danger').forEach((btn) => {
    if (isEditable) {
      (btn as HTMLButtonElement).removeAttribute('disabled');
      (btn as HTMLElement).style.opacity = '1';
      (btn as HTMLElement).style.cursor = 'pointer';
    } else {
      (btn as HTMLButtonElement).setAttribute('disabled', 'true');
      (btn as HTMLElement).style.opacity = '0.5';
      (btn as HTMLElement).style.cursor = 'not-allowed';
    }
  });
}

/** Alias untuk reloadAll — konsisten dengan pattern lama */
export const reloadAll = loadMonthData;
