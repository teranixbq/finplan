// ============================================================
// frontend/actions/daily.ts
// ============================================================

import { el, parseAmount, today } from '../utils';
import { t } from '../i18n';
import { showToast } from '../toast';
import { closeModal } from '../modals';
import { postDaily, deleteDaily as apiDeleteDaily } from '../api';
import { S } from '../state';
import { reloadAll } from '../data';
import { confirmDelete } from './confirm';

export async function submitAddDaily(): Promise<void> {
  const date = (el('daily-date') as HTMLInputElement).value;
  const name = (el('daily-name') as HTMLInputElement).value.trim();
  const amount = parseAmount((el('daily-amount') as HTMLInputElement).value);
  const note = (el('daily-note') as HTMLInputElement).value.trim();
  const expenseRef = (el('daily-expense-ref') as HTMLSelectElement).value;

  if (!date) return showToast(t('validDateRequired'), 'error');
  if (!name) return showToast(t('validNameRequired'), 'error');
  if (!amount) return showToast(t('validAmountRequired'), 'error');
  if (!S.currentMonthId) return showToast(t('validMonthRequired'), 'error');

  const body: Record<string, unknown> = { monthId: S.currentMonthId, date, name, amount };
  if (note) body['note'] = note;
  if (expenseRef) body['expenseId'] = parseInt(expenseRef);

  try {
    await postDaily(body);
    closeModal('modal-daily');
    (el('daily-name') as HTMLInputElement).value = '';
    (el('daily-amount') as HTMLInputElement).value = '';
    (el('daily-note') as HTMLInputElement).value = '';
    (el('daily-expense-ref') as HTMLSelectElement).value = '';
    (el('daily-date') as HTMLInputElement).value = today();
    showToast(t('savedSuccess'), 'success');
    await reloadAll();
  } catch (e) {
    showToast((e as Error).message, 'error');
  }
}

export async function deleteDaily(id: number): Promise<void> {
  if (!confirmDelete('daily-' + id)) return;
  try {
    await apiDeleteDaily(id);
    showToast(t('deletedSuccess'), 'success');
    await reloadAll();
  } catch (e) {
    showToast((e as Error).message, 'error');
  }
}
