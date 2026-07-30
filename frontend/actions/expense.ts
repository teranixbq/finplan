// ============================================================
// frontend/actions/expense.ts
// ============================================================

import { el, parseAmount } from '../utils';
import { t } from '../i18n';
import { showToast } from '../toast';
import { closeModal } from '../modals';
import { postExpense, deleteExpense as apiDeleteExpense, patchExpenseActive } from '../api';
import { S } from '../state';
import { reloadAll } from '../data';
import { confirmDelete } from './confirm';

export async function submitAddExpense(): Promise<void> {
  const name = (el('exp-name') as HTMLInputElement).value.trim();
  const category = (el('exp-category') as HTMLSelectElement).value;
  const assetId = (el('exp-asset') as HTMLSelectElement).value;
  const amount = parseAmount((el('exp-amount') as HTMLInputElement).value);
  const periodMonths =
    parseInt((el('exp-period-months') as HTMLInputElement)?.value || '0') || null;
  const periodType = (el('exp-period-type') as HTMLSelectElement)?.value || null;

  if (!name) return showToast(t('validNameRequired'), 'error');
  if (!amount) return showToast(t('validAmountRequired'), 'error');
  if (!S.currentMonthId) return showToast(t('validMonthRequired'), 'error');

  try {
    await postExpense({
      monthId: S.currentMonthId,
      name,
      category,
      assetId: assetId ? parseInt(assetId) : null,
      amount,
      periodMonths: category === 'periodic' ? periodMonths : null,
      periodType: category === 'periodic' ? periodType : null,
    });
    closeModal('modal-expense');
    (el('exp-name') as HTMLInputElement).value = '';
    (el('exp-amount') as HTMLInputElement).value = '';
    showToast(t('savedSuccess'), 'success');
    await reloadAll();
  } catch (e) {
    showToast((e as Error).message, 'error');
  }
}

export async function toggleExpense(id: number, currentActive: number): Promise<void> {
  try {
    await patchExpenseActive(id, currentActive ? 0 : 1);
    await reloadAll();
  } catch (e) {
    showToast((e as Error).message, 'error');
  }
}

export async function deleteExpense(id: number): Promise<void> {
  if (!confirmDelete('exp-' + id)) return;
  try {
    await apiDeleteExpense(id);
    showToast(t('deletedSuccess'), 'success');
    await reloadAll();
  } catch (e) {
    showToast((e as Error).message, 'error');
  }
}

export function onExpenseCategoryChange(): void {
  const cat = (el('exp-category') as HTMLSelectElement).value;
  el('periodic-fields')?.classList.toggle('hidden', cat !== 'periodic');
}
