// ============================================================
// frontend/actions/month.ts — month submit/edit handlers
// ============================================================

import { S } from '../state';
import { el, parseAmount, today } from '../utils';
import { t } from '../i18n';
import { showToast } from '../toast';
import { openModal, closeModal } from '../modals';
import { postMonth, putMonth } from '../api';
import { loadMonths, loadMonthData } from '../data';
import { populateMonthSelect } from '../selects';

export async function submitNewMonth(): Promise<void> {
  const month = parseInt((el('nm-month') as HTMLInputElement).value);
  const year = parseInt((el('nm-year') as HTMLInputElement).value);
  const salary = parseAmount((el('nm-salary') as HTMLInputElement).value);
  const salaryDate = parseInt((el('nm-salarydate') as HTMLInputElement).value) || 28;

  if (!year) return showToast(t('validYearRequired'), 'error');

  try {
    await postMonth({ month, year, salary, salaryDate });
    closeModal('modal-newmonth');
    (el('nm-salary') as HTMLInputElement).value = '';
    showToast(t('savedSuccess'), 'success');
    await loadMonths();
    S.currentMonthId = S.months[S.months.length - 1].id;
    populateMonthSelect();
    await loadMonthData();
  } catch (e) {
    showToast((e as Error).message || t('monthExists'), 'error');
  }
}

export function openEditSalary(): void {
  if (!S.summary?.month) return;
  const m = S.summary.month;
  (el('edit-salary') as HTMLInputElement).value = m.salary
    ? Math.round(m.salary).toLocaleString('id-ID')
    : '';
  (el('edit-salarydate') as HTMLInputElement).value = String(m.salaryDate || 28);
  openModal('modal-salary');
}

export async function submitEditSalary(): Promise<void> {
  const salary = parseAmount((el('edit-salary') as HTMLInputElement).value);
  const salaryDate = parseInt((el('edit-salarydate') as HTMLInputElement).value) || 28;
  if (!S.currentMonthId) return showToast(t('validMonthRequired'), 'error');

  try {
    await putMonth(S.currentMonthId, { salary, salaryDate });
    closeModal('modal-salary');
    showToast(t('savedSuccess'), 'success');
    await loadMonthData();
  } catch (e) {
    showToast((e as Error).message, 'error');
  }
}
