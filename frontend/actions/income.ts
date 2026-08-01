// ============================================================
// frontend/actions/income.ts
// ============================================================

import { el, parseAmount } from '../helpers/utils';
import { t } from '../helpers/i18n';
import { showToast } from '../helpers/toast';
import { closeModal } from '../helpers/modals';
import { postIncome, deleteIncome as apiDeleteIncome } from '../services/api';
import { S } from '../services/state';
import { reloadAll } from '../services/data';
import { confirmDelete } from './confirm';

export async function submitAddIncome(): Promise<void> {
  const name = (el('inc-name') as HTMLInputElement).value.trim();
  const amount = parseAmount((el('inc-amount') as HTMLInputElement).value);
  const assetId = (el('inc-asset') as HTMLSelectElement).value;

  if (!name) return showToast(t('validNameRequired'), 'error');
  if (!amount) return showToast(t('validAmountRequired'), 'error');
  if (!S.currentMonthId) return showToast(t('validMonthRequired'), 'error');

  try {
    await postIncome({
      monthId: S.currentMonthId,
      name,
      amount,
      assetId: assetId ? parseInt(assetId) : undefined,
    });
    closeModal('modal-income');
    (el('inc-name') as HTMLInputElement).value = '';
    (el('inc-amount') as HTMLInputElement).value = '';
    showToast(t('savedSuccess'), 'success');
    await reloadAll();
  } catch (e) {
    showToast((e as Error).message, 'error');
  }
}

export async function deleteIncome(id: number): Promise<void> {
  if (!confirmDelete('inc-' + id)) return;
  try {
    await apiDeleteIncome(id);
    showToast(t('deletedSuccess'), 'success');
    await reloadAll();
  } catch (e) {
    showToast((e as Error).message, 'error');
  }
}
