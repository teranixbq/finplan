// ============================================================
// frontend/actions/investment.ts
// ============================================================

import { el, parseAmount } from '../helpers/utils';
import { t } from '../helpers/i18n';
import { showToast } from '../helpers/toast';
import { closeModal } from '../helpers/modals';
import { postInvestment, deleteInvestment as apiDeleteInvestment } from '../services/api';
import { S } from '../services/state';
import { reloadAll } from '../services/data';
import { confirmDelete } from './confirm';

export async function submitAddInvestment(): Promise<void> {
  const name = (el('inv-name') as HTMLInputElement).value.trim();
  const type = (el('inv-type') as HTMLSelectElement).value;
  const amount = parseAmount((el('inv-amount') as HTMLInputElement).value);

  if (!name) return showToast(t('validNameRequired'), 'error');
  if (!amount) return showToast(t('validAmountRequired'), 'error');
  if (!S.currentMonthId) return showToast(t('validMonthRequired'), 'error');

  try {
    await postInvestment({ monthId: S.currentMonthId, name, type, amount });
    closeModal('modal-investment');
    (el('inv-name') as HTMLInputElement).value = '';
    (el('inv-amount') as HTMLInputElement).value = '';
    showToast(t('savedSuccess'), 'success');
    await reloadAll();
  } catch (e) {
    showToast((e as Error).message, 'error');
  }
}

export async function deleteInvestment(id: number): Promise<void> {
  if (!confirmDelete('inv-' + id)) return;
  try {
    await apiDeleteInvestment(id);
    showToast(t('deletedSuccess'), 'success');
    await reloadAll();
  } catch (e) {
    showToast((e as Error).message, 'error');
  }
}
