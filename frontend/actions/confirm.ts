// ============================================================
// frontend/actions/confirm.ts — double-tap delete confirm
// ============================================================

import { S } from '../state';
import { showToast } from '../toast';
import { t } from '../i18n';

export function confirmDelete(key: string): boolean {
  const now = Date.now();
  if (S.deleteConfirm[key] && now - S.deleteConfirm[key] < 3000) {
    delete S.deleteConfirm[key];
    return true;
  }
  S.deleteConfirm[key] = now;
  showToast(t('deleteConfirm'), 'warning');
  return false;
}
