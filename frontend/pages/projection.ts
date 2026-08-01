// ============================================================
// frontend/pages/projection.ts — Proyeksi page (month comparison)
// ============================================================

import { S } from '../state';
import { rp, MONTH_NAMES } from '../utils';
import { t } from '../i18n';
import { getMonthsCompare } from '../api';

type CompareSide = {
  month: { id: number; month: number; year: number; salary: number };
  totalCash: number;
  totalInvestment: number;
  totalFixed: number;
  totalVariable: number;
  totalPeriodic: number;
  totalTabungan: number;
  totalDaily: number;
  totalIncomes: number;
  totalBudget: number;
  totalOut: number;
  sisaSebelumGajian: number;
  sisaAkhirBulan: number;
  grandTotal: number;
};

function monthLabel(m: { month: number; year: number }): string {
  return `${MONTH_NAMES[m.month - 1]} ${m.year}`;
}

function diffClass(val: number, lowerIsBetter = false): string {
  if (val === 0) return '';
  const positive = lowerIsBetter ? val < 0 : val > 0;
  return positive ? 'proj-diff-good' : 'proj-diff-bad';
}

function diffText(val: number): string {
  if (val === 0) return '';
  const sign = val > 0 ? '+' : '';
  return `${sign}${rp(val)}`;
}

function row(
  label: string,
  a: number,
  b: number,
  lowerIsBetter = false,
): string {
  const diff = b - a;
  const cls = diffClass(diff, lowerIsBetter);
  return `
    <tr>
      <td class="proj-compare-label">${label}</td>
      <td class="proj-compare-val">${rp(a)}</td>
      <td class="proj-compare-val">${rp(b)}</td>
      <td class="proj-compare-diff ${cls}">${diffText(diff)}</td>
    </tr>`;
}

export async function renderProjection(): Promise<void> {
  const container = document.getElementById('page-projection');
  if (!container) return;

  if (S.months.length < 2) {
    container.innerHTML = `
      <div class="proj-empty">
        <p>${t('projectionNeedTwoMonths')}</p>
      </div>`;
    return;
  }

  // Default: compare last two months
  const aMonth = S.months[S.months.length - 2];
  const bMonth = S.months[S.months.length - 1];

  // Read selector values if already rendered
  const selA = document.getElementById('proj-sel-a') as HTMLSelectElement | null;
  const selB = document.getElementById('proj-sel-b') as HTMLSelectElement | null;
  const aId = selA ? parseInt(selA.value) : aMonth.id;
  const bId = selB ? parseInt(selB.value) : bMonth.id;

  // Build month selector options
  const monthOptions = S.months
    .map((m) => `<option value="${m.id}">${monthLabel(m)}</option>`)
    .join('');

  // Render skeleton with selectors first
  container.innerHTML = `
    <div class="proj-compare-wrap">
      <div class="proj-compare-header">
        <div class="proj-compare-selectors">
          <div class="proj-sel-group">
            <label class="proj-sel-label">${t('compareMonthA')}</label>
            <select id="proj-sel-a" class="form-select proj-sel" onchange="window.onProjectionSelChange()">${monthOptions}</select>
          </div>
          <div class="proj-sel-vs">vs</div>
          <div class="proj-sel-group">
            <label class="proj-sel-label">${t('compareMonthB')}</label>
            <select id="proj-sel-b" class="form-select proj-sel" onchange="window.onProjectionSelChange()">${monthOptions}</select>
          </div>
        </div>
      </div>
      <div id="proj-compare-body">
        <div class="proj-loading">${t('loading') || 'Memuat...'}</div>
      </div>
    </div>`;

  // Set selector values
  const newSelA = document.getElementById('proj-sel-a') as HTMLSelectElement;
  const newSelB = document.getElementById('proj-sel-b') as HTMLSelectElement;
  newSelA.value = String(aId);
  newSelB.value = String(bId);

  await loadCompare(aId, bId);
}

async function loadCompare(aId: number, bId: number): Promise<void> {
  const body = document.getElementById('proj-compare-body');
  if (!body) return;

  if (aId === bId) {
    body.innerHTML = `<div class="proj-empty"><p>${t('compareSameMonth')}</p></div>`;
    return;
  }

  try {
    const { a, b } = await getMonthsCompare(aId, bId);
    body.innerHTML = buildTable(a, b);
  } catch (e) {
    body.innerHTML = `<div class="proj-empty"><p>${t('errorLoading') || 'Gagal memuat data.'}</p></div>`;
  }
}

function buildTable(a: CompareSide, b: CompareSide): string {
  return `
    <div class="proj-compare-table-wrap">
      <table class="proj-compare-table">
        <thead>
          <tr>
            <th class="proj-compare-label"></th>
            <th class="proj-compare-val">${monthLabel(a.month)}</th>
            <th class="proj-compare-val">${monthLabel(b.month)}</th>
            <th class="proj-compare-diff">${t('difference')}</th>
          </tr>
        </thead>
        <tbody>
          <tr class="proj-section-header"><td colspan="4">${t('income')}</td></tr>
          ${row(t('salary'), a.month.salary, b.month.salary)}
          ${row(t('incomes'), a.totalIncomes, b.totalIncomes)}

          <tr class="proj-section-header"><td colspan="4">${t('expenses')}</td></tr>
          ${row(t('fixed'), a.totalFixed, b.totalFixed, true)}
          ${row(t('variable'), a.totalVariable, b.totalVariable, true)}
          ${row(t('periodic'), a.totalPeriodic, b.totalPeriodic, true)}
          ${row(t('tabungan'), a.totalTabungan, b.totalTabungan)}
          ${row(t('dailyExpenses'), a.totalDaily, b.totalDaily, true)}
          ${row(t('totalOut'), a.totalOut, b.totalOut, true)}

          <tr class="proj-section-header"><td colspan="4">${t('assets')}</td></tr>
          ${row(t('totalCash'), a.totalCash, b.totalCash)}
          ${row(t('totalInvestment'), a.totalInvestment, b.totalInvestment)}
          ${row(t('grandTotal'), a.grandTotal, b.grandTotal)}

          <tr class="proj-section-header"><td colspan="4">${t('cashflow')}</td></tr>
          ${row(t('remainingBeforeSalary'), a.sisaSebelumGajian, b.sisaSebelumGajian)}
          ${row(t('remaining'), a.sisaAkhirBulan, b.sisaAkhirBulan)}
        </tbody>
      </table>
    </div>`;
}

export function onProjectionSelChange(): void {
  const selA = document.getElementById('proj-sel-a') as HTMLSelectElement | null;
  const selB = document.getElementById('proj-sel-b') as HTMLSelectElement | null;
  if (!selA || !selB) return;
  loadCompare(parseInt(selA.value), parseInt(selB.value));
}
