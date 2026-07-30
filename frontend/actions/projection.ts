// ============================================================
// frontend/actions/projection.ts
// ============================================================

import { el, parseAmount } from '../utils';
import { t } from '../i18n';
import { showToast } from '../toast';
import { closeModal, openModal } from '../modals';
import {
  postProjection,
  putProjection,
  deleteProjection as apiDeleteProjection,
  resetProjection as apiResetProjection,
} from '../api';
import { S } from '../state';
import { reloadAll } from '../data';
import { confirmDelete } from './confirm';

export function openProjectionModal(): void {
  (el('proj-id') as HTMLInputElement).value = '';
  (el('proj-name') as HTMLInputElement).value = '';
  (el('proj-amount') as HTMLInputElement).value = '';
  el('proj-modal-title').textContent = t('addProjection');
  openModal('modal-projection');
}

export function editProjection(id: number): void {
  const it = S.projection?.items.find((i) => i.id === id);
  if (!it) return;
  (el('proj-id') as HTMLInputElement).value = String(it.id);
  (el('proj-name') as HTMLInputElement).value = it.name;
  (el('proj-category') as HTMLSelectElement).value = it.category;
  if (el('proj-asset'))
    (el('proj-asset') as HTMLSelectElement).value = it.assetId ? String(it.assetId) : '';
  (el('proj-amount') as HTMLInputElement).value = it.amount
    ? Math.round(it.amount).toLocaleString('id-ID')
    : '';
  el('proj-modal-title').textContent = t('editProjection');
  openModal('modal-projection');
}

export async function submitProjection(): Promise<void> {
  const id = (el('proj-id') as HTMLInputElement).value;
  const name = (el('proj-name') as HTMLInputElement).value.trim();
  const category = (el('proj-category') as HTMLSelectElement).value;
  const assetId = (el('proj-asset') as HTMLSelectElement)?.value
    ? parseInt((el('proj-asset') as HTMLSelectElement).value)
    : undefined;
  const amount = parseAmount((el('proj-amount') as HTMLInputElement).value);

  if (!name) return showToast(t('validNameRequired'), 'error');
  if (!amount) return showToast(t('validAmountRequired'), 'error');
  if (!S.projection?.target) return showToast(t('validMonthRequired'), 'error');

  try {
    if (id) {
      await putProjection(parseInt(id), { name, category, amount, assetId: assetId ?? null });
    } else {
      await postProjection({
        targetMonth: S.projection.target.month,
        targetYear: S.projection.target.year,
        name,
        category,
        amount,
        assetId,
      });
    }
    closeModal('modal-projection');
    showToast(t('savedSuccess'), 'success');
    await reloadAll();
  } catch (e) {
    showToast((e as Error).message, 'error');
  }
}

export async function deleteProjection(id: number): Promise<void> {
  if (!confirmDelete('proj-' + id)) return;
  try {
    await apiDeleteProjection(id);
    showToast(t('deletedSuccess'), 'success');
    await reloadAll();
  } catch (e) {
    showToast((e as Error).message, 'error');
  }
}

export async function resetProjection(): Promise<void> {
  const key = 'proj-reset';
  const now = Date.now();
  if (!(S.deleteConfirm[key] && now - S.deleteConfirm[key] < 3000)) {
    S.deleteConfirm[key] = now;
    showToast(t('resetConfirm'), 'warning');
    return;
  }
  delete S.deleteConfirm[key];
  try {
    await apiResetProjection(S.currentMonthId!);
    showToast(t('savedSuccess'), 'success');
    await reloadAll();
  } catch (e) {
    showToast((e as Error).message, 'error');
  }
}
