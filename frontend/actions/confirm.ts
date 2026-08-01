// ============================================================
// frontend/actions/confirm.ts — double-tap delete confirm
// ============================================================

import { S } from '../services/state';
import { showToast } from '../helpers/toast';
import { t } from '../helpers/i18n';

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
