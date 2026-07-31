// ============================================================
// frontend/main.ts — entry point
// ============================================================

import { S } from './state';
import { el, today, fmtAmountInput } from './utils';
import { setLang, getCurrentLang, t } from './i18n';
import { getMe } from './api';
import { loadMonths, loadMonthData } from './data';
import { navigate, switchTab } from './navigation';
import { openModal, closeModal, closeBreakdownModal, showBreakdownModal } from './modals';
import { openAssetHistory } from './actions/asset';
import { submitNewMonth, openEditSalary, submitEditSalary } from './actions/month';
import { submitAddAsset, deleteAsset } from './actions/asset';
import {
  submitAddExpense,
  deleteExpense,
  toggleExpense,
  onExpenseCategoryChange,
} from './actions/expense';
import { submitAddInvestment, deleteInvestment } from './actions/investment';
import { submitAddIncome, deleteIncome } from './actions/income';
import { submitAddDaily, deleteDaily } from './actions/daily';
import {
  openProjectionModal,
  editProjection,
  submitProjection,
  deleteProjection,
  resetProjection,
} from './actions/projection';
import { applyDailyFilter, clearDailyFilter } from './pages/daily';

// ============================================================
// Global functions for onclick handlers in HTML
// ============================================================

declare global {
  interface Window {
    navigate: typeof navigate;
    switchTab: typeof switchTab;
    openModal: typeof openModal;
    closeModal: typeof closeModal;
    closeBreakdownModal: typeof closeBreakdownModal;
    showBreakdownModal: typeof showBreakdownModal;
    openAssetHistory: typeof openAssetHistory;
    submitNewMonth: typeof submitNewMonth;
    openEditSalary: typeof openEditSalary;
    submitEditSalary: typeof submitEditSalary;
    submitAddAsset: typeof submitAddAsset;
    deleteAsset: typeof deleteAsset;
    submitAddExpense: typeof submitAddExpense;
    deleteExpense: typeof deleteExpense;
    toggleExpense: typeof toggleExpense;
    onExpenseCategoryChange: typeof onExpenseCategoryChange;
    submitAddInvestment: typeof submitAddInvestment;
    deleteInvestment: typeof deleteInvestment;
    submitAddIncome: typeof submitAddIncome;
    deleteIncome: typeof deleteIncome;
    submitAddDaily: typeof submitAddDaily;
    deleteDaily: typeof deleteDaily;
    openProjectionModal: typeof openProjectionModal;
    editProjection: typeof editProjection;
    submitProjection: typeof submitProjection;
    deleteProjection: typeof deleteProjection;
    resetProjection: typeof resetProjection;
    onMonthChange: () => void;
    logout: () => void;
    onDailyExpenseRefChange: () => void;
    applyDailyFilter: typeof applyDailyFilter;
    clearDailyFilter: typeof clearDailyFilter;
  }
}

window.navigate = navigate;
window.switchTab = switchTab;
window.openModal = openModal;
window.closeModal = closeModal;
window.closeBreakdownModal = closeBreakdownModal;
window.showBreakdownModal = showBreakdownModal;
window.openAssetHistory = openAssetHistory;
window.submitNewMonth = submitNewMonth;
window.openEditSalary = openEditSalary;
window.submitEditSalary = submitEditSalary;
window.submitAddAsset = submitAddAsset;
window.deleteAsset = deleteAsset;
window.submitAddExpense = submitAddExpense;
window.deleteExpense = deleteExpense;
window.toggleExpense = toggleExpense;
window.onExpenseCategoryChange = onExpenseCategoryChange;
window.submitAddInvestment = submitAddInvestment;
window.deleteInvestment = deleteInvestment;
window.submitAddIncome = submitAddIncome;
window.deleteIncome = deleteIncome;
window.submitAddDaily = submitAddDaily;
window.deleteDaily = deleteDaily;
window.openProjectionModal = openProjectionModal;
window.editProjection = editProjection;
window.submitProjection = submitProjection;
window.deleteProjection = deleteProjection;
window.resetProjection = resetProjection;
window.applyDailyFilter = applyDailyFilter;
window.clearDailyFilter = clearDailyFilter;

window.onMonthChange = async () => {
  const select = el('month-select') as HTMLSelectElement;
  S.currentMonthId = parseInt(select.value);
  await loadMonthData();
};

window.logout = async () => {
  if (!confirm(t('logoutConfirm'))) return;
  await fetch('/auth/logout', { method: 'POST' });
  window.location.href = '/login';
};

window.onDailyExpenseRefChange = () => {
  const sel = el('daily-expense-ref') as HTMLSelectElement;
  const nameInput = el('daily-name') as HTMLInputElement;
  const amountInput = el('daily-amount') as HTMLInputElement;

  if (sel.value) {
    const opt = sel.selectedOptions[0];
    const expName = opt.textContent || '';
    const expAmount = opt.dataset['amount'] || '';
    nameInput.value = expName;
    amountInput.value = expAmount ? Math.round(parseFloat(expAmount)).toLocaleString('id-ID') : '';
  }
};

// ============================================================
// App initialization
// ============================================================

async function initApp() {
  // Step 1: auth check — redirect to GitHub login if not authenticated
  let me: { name: string; email: string };
  try {
    me = await getMe();
  } catch (e) {
    console.error('Auth failed:', e);
    window.location.href = '/auth/github';
    return;
  }

  // Step 2: render UI — errors here should NOT redirect to login
  try {
    el('user-name').textContent = me.name;
    el('user-email').textContent = me.email;

    // Set default daily date
    const dailyDateInput = el('daily-date') as HTMLInputElement;
    if (dailyDateInput) dailyDateInput.value = today();

    // Set default month/year for new month modal
    const now = new Date();
    const nmMonth = el('nm-month') as HTMLSelectElement;
    const nmYear = el('nm-year') as HTMLInputElement;
    if (nmMonth) nmMonth.value = String(now.getMonth() + 1);
    if (nmYear) nmYear.value = String(now.getFullYear());

    // Apply i18n
    setLang((localStorage.getItem('fp_lang') as 'id' | 'en') || 'id');

    // Lang toggle button
    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) {
      langBtn.textContent = (localStorage.getItem('fp_lang') || 'id').toUpperCase();
      langBtn.addEventListener('click', () => {
        const next = getCurrentLang() === 'id' ? 'en' : 'id';
        setLang(next);
        langBtn.textContent = next.toUpperCase();
      });
    }

    await loadMonths();
  } catch (e) {
    console.error('App init error:', e);
    // do NOT redirect — log only so we can debug
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Global amount input formatter — format semua .amount-input dengan thousand separator
  document.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    if (target.classList.contains('amount-input')) {
      fmtAmountInput(target);
    }
  });
  initApp();
});
