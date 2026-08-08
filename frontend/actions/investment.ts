// ============================================================
// frontend/actions/investment.ts
// ============================================================

import { el, parseAmount } from '../helpers/utils';
import { t } from '../helpers/i18n';
import { showToast } from '../helpers/toast';
import { openModal, closeModal } from '../helpers/modals';
import {
  postInvestment,
  putInvestment,
  deleteInvestment as apiDeleteInvestment,
} from '../services/api';
import { S } from '../services/state';
import { reloadAll } from '../services/data';
import { confirmDelete } from './confirm';

export function openEditInvestment(id: number): void {
  const investment = S.investments.find((inv) => inv.id === id);
  if (!investment) return;

  (el('inv-id') as HTMLInputElement).value = String(id);
  (el('inv-name') as HTMLInputElement).value = investment.name;
  (el('inv-type') as HTMLSelectElement).value = investment.type;
  (el('inv-amount') as HTMLInputElement).value = String(investment.amount);

  const modalTitle = el('modal-investment')?.querySelector('.modal-title');
  if (modalTitle) modalTitle.textContent = t('editInvestment') || 'Edit Investasi';

  openModal('modal-investment');
}

export async function submitAddInvestment(): Promise<void> {
  const idInput = el('inv-id') as HTMLInputElement;
  const id = idInput.value ? parseInt(idInput.value) : null;
  const name = (el('inv-name') as HTMLInputElement).value.trim();
  const type = (el('inv-type') as HTMLSelectElement).value;
  const amount = parseAmount((el('inv-amount') as HTMLInputElement).value);

  if (!name) return showToast(t('validNameRequired'), 'error');
  if (!amount) return showToast(t('validAmountRequired'), 'error');
  if (!id && !S.currentMonthId) return showToast(t('validMonthRequired'), 'error');

  try {
    if (id) {
      await putInvestment(id, { name, type, amount });
    } else {
      await postInvestment({ monthId: S.currentMonthId, name, type, amount });
    }
    closeModal('modal-investment');
    (el('inv-id') as HTMLInputElement).value = '';
    (el('inv-name') as HTMLInputElement).value = '';
    (el('inv-amount') as HTMLInputElement).value = '';

    const modalTitle = el('modal-investment')?.querySelector('.modal-title');
    if (modalTitle) modalTitle.textContent = t('addInvestment') || 'Tambah Investasi';

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
