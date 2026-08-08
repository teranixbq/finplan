// ============================================================
// frontend/actions/expense.ts
// ============================================================

import { el, parseAmount } from '../helpers/utils';
import { t } from '../helpers/i18n';
import { showToast } from '../helpers/toast';
import { openModal, closeModal } from '../helpers/modals';
import {
  postExpense,
  putExpense,
  deleteExpense as apiDeleteExpense,
  patchExpenseActive,
} from '../services/api';
import { S } from '../services/state';
import { reloadAll } from '../services/data';
import { confirmDelete } from './confirm';

export function openEditExpense(id: number): void {
  const expense = S.expenses.find((exp) => exp.id === id);
  if (!expense) return;

  (el('exp-id') as HTMLInputElement).value = String(id);
  (el('exp-name') as HTMLInputElement).value = expense.name;
  (el('exp-category') as HTMLSelectElement).value = expense.category;
  (el('exp-asset') as HTMLSelectElement).value = String(expense.assetId || '');
  (el('exp-amount') as HTMLInputElement).value = String(expense.amount);

  if (expense.category === 'periodic' && expense.periodMonths) {
    (el('exp-period-value') as HTMLInputElement).value = String(expense.periodMonths);
    (el('exp-period-type') as HTMLSelectElement).value = expense.periodType || 'month';
    el('periodic-fields')?.classList.remove('hidden');
  } else {
    el('periodic-fields')?.classList.add('hidden');
  }

  const modalTitle = el('modal-expense')?.querySelector('.modal-title');
  if (modalTitle) modalTitle.textContent = t('editExpense') || 'Edit Pengeluaran';

  openModal('modal-expense');
}

export async function submitAddExpense(): Promise<void> {
  const idInput = el('exp-id') as HTMLInputElement;
  const id = idInput.value ? parseInt(idInput.value) : null;
  const name = (el('exp-name') as HTMLInputElement).value.trim();
  const category = (el('exp-category') as HTMLSelectElement).value;
  const assetId = (el('exp-asset') as HTMLSelectElement).value;
  const amount = parseAmount((el('exp-amount') as HTMLInputElement).value);
  const periodMonths = parseInt((el('exp-period-value') as HTMLInputElement)?.value || '0') || null;
  const periodType = (el('exp-period-type') as HTMLSelectElement)?.value || null;

  if (!name) return showToast(t('validNameRequired'), 'error');
  if (!amount) return showToast(t('validAmountRequired'), 'error');
  if (!id && !S.currentMonthId) return showToast(t('validMonthRequired'), 'error');

  try {
    const payload: any = {
      name,
      category,
      assetId: assetId ? parseInt(assetId) : null,
      amount,
      periodMonths: category === 'periodic' ? periodMonths : null,
      periodType: category === 'periodic' ? periodType : null,
    };

    if (id) {
      await putExpense(id, payload);
    } else {
      payload.monthId = S.currentMonthId;
      await postExpense(payload);
    }

    closeModal('modal-expense');
    (el('exp-id') as HTMLInputElement).value = '';
    (el('exp-name') as HTMLInputElement).value = '';
    (el('exp-amount') as HTMLInputElement).value = '';

    const modalTitle = el('modal-expense')?.querySelector('.modal-title');
    if (modalTitle) modalTitle.textContent = t('addExpense') || 'Tambah Pengeluaran';

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
