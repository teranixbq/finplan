// ============================================================
// frontend/actions/asset.ts
// ============================================================

import { S } from '../state';
import { el, parseAmount } from '../utils';
import { t } from '../i18n';
import { showToast } from '../toast';
import { openModal, closeModal } from '../modals';
import { postAsset, deleteAsset as apiDeleteAsset } from '../api';
import { reloadAll } from '../data';
import { confirmDelete } from './confirm';

export async function submitAddAsset(): Promise<void> {
  const name = (el('asset-name') as HTMLInputElement).value.trim();
  const amount = parseAmount((el('asset-amount') as HTMLInputElement).value);
  if (!name) return showToast(t('validNameRequired'), 'error');

  try {
    await postAsset({ name, amount });
    closeModal('modal-asset');
    (el('asset-name') as HTMLInputElement).value = '';
    (el('asset-amount') as HTMLInputElement).value = '';
    showToast(t('savedSuccess'), 'success');
    await reloadAll();
  } catch (e) {
    showToast((e as Error).message, 'error');
  }
}

export async function deleteAsset(id: number): Promise<void> {
  if (!confirmDelete('asset-' + id)) return;
  try {
    await apiDeleteAsset(id);
    showToast(t('deletedSuccess'), 'success');
    await reloadAll();
  } catch (e) {
    showToast((e as Error).message, 'error');
  }
}

export async function openAssetHistory(): Promise<void> {
  try {
    const res = await fetch('/api/incomes/history/all');
    const history = (await res.json()) as any[];
    const tbody = el('asset-history-body');
    if (!tbody) return;
    if (!history.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty">${t('noHistory')}</td></tr>`;
    } else {
      tbody.innerHTML = history
        .map((h) => {
          const asset = S.assets.find((a) => a.id === h.assetId);
          const date = h.createdAt ? new Date(h.createdAt * 1000).toLocaleDateString('id-ID') : '-';
          const sign = h.amount >= 0 ? '+' : '';
          return `<tr>
            <td>${date}</td>
            <td>${asset?.name || '-'}</td>
            <td>${h.name}</td>
            <td style="color:${h.amount >= 0 ? '#8fb88f' : '#d98a7f'}">${sign}${Math.round(h.amount).toLocaleString('id-ID')}</td>
            <td>${Math.round(h.balanceAfter).toLocaleString('id-ID')}</td>
          </tr>`;
        })
        .join('');
    }
    openModal('modal-history');
  } catch (e) {
    showToast((e as Error).message, 'error');
  }
}
