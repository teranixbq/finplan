// ============================================================
// frontend/pages/projection.ts — Proyeksi page
// Section 1: Proyeksi Bulan Depan (tambah/edit/hapus)
// Section 2: Comparison dua bulan
// ============================================================

import { S } from '../services/state';
import { rp, MONTH_NAMES, isLatestMonth } from '../helpers/utils';
import { t } from '../helpers/i18n';
import { getMonthsCompare } from '../services/api';

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

function compareRow(label: string, a: number, b: number, lowerIsBetter = false): string {
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

// ── Section 1: render proyeksi bulan depan ──────────────────
function renderPlanSection(): string {
  const isEditable = isLatestMonth(S.months, S.currentMonthId);
  const proj = S.projection;
  const items = proj?.items ?? [];

  // Target month label (next month after current)
  const cur = S.months.find((m) => m.id === S.currentMonthId);
  let targetLabel = '-';
  if (cur) {
    const nm = cur.month === 12 ? 1 : cur.month + 1;
    const ny = cur.month === 12 ? cur.year + 1 : cur.year;
    targetLabel = `${MONTH_NAMES[nm - 1]} ${ny}`;
  }

  const total = items.reduce((s: number, i) => s + i.amount, 0);

  const actionBtns = isEditable ? `
    <div class="proj-plan-actions">
      <button class="btn btn-ghost btn-sm action-btn" onclick="window.resetProjection()" data-i18n="resetProjection">Samakan dengan Bulan Ini</button>
      <button class="btn btn-primary btn-sm action-btn" onclick="window.openProjectionModal()" data-i18n="addProjection">+ Tambah Item</button>
    </div>` : '';

  const tableRows = items.length === 0
    ? `<tr><td colspan="5" class="empty">${t('noProjection')}</td></tr>`
    : items.map((it) => {
        const assetName = S.assets.find((a) => a.id === it.assetId)?.name || '-';
        const editBtn = isEditable
          ? `<button class="btn-icon" onclick="window.editProjection(${it.id})"><i class="fa-solid fa-pen"></i></button>
             <button class="btn-icon danger" onclick="window.deleteProjection(${it.id})"><i class="fa-solid fa-trash"></i></button>`
          : '';
        return `<tr>
          <td data-label="${t('name')}">${it.name}</td>
          <td data-label="${t('category')}">${t(it.category)}</td>
          <td data-label="${t('source')}">${assetName}</td>
          <td data-label="${t('amount')}" style="text-align:right">${rp(it.amount)}</td>
          <td class="row-actions">${editBtn}</td>
        </tr>`;
      }).join('');

  return `
    <div class="proj-plan-wrap card section">
      <div class="section-header">
        <span class="section-title">
          <span data-i18n="projectionForMonth">${t('projectionForMonth')}</span>
          <span class="proj-target" id="proj-target-label">${targetLabel}</span>
        </span>
        ${actionBtns}
      </div>
      <div class="section-note" data-i18n="projectionNote">${t('projectionNote')}</div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th data-i18n="name">${t('name')}</th>
            <th data-i18n="category">${t('category')}</th>
            <th data-i18n="source">${t('source')}</th>
            <th style="text-align:right" data-i18n="amount">${t('amount')}</th>
            <th></th>
          </tr></thead>
          <tbody id="projection-body">${tableRows}</tbody>
          <tfoot><tr class="proj-total-row">
            <td colspan="3" data-i18n="projectionTotal">${t('projectionTotal')}</td>
            <td style="text-align:right" id="proj-total">${rp(total)}</td>
            <td></td>
          </tr></tfoot>
        </table>
      </div>
    </div>`;
}

// ── Section 2: compare ──────────────────────────────────────
function buildCompareTable(a: CompareSide, b: CompareSide): string {
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
          ${compareRow(t('salary'), a.month.salary, b.month.salary)}
          ${compareRow(t('incomes'), a.totalIncomes, b.totalIncomes)}
          <tr class="proj-section-header"><td colspan="4">${t('expenses')}</td></tr>
          ${compareRow(t('fixed'), a.totalFixed, b.totalFixed, true)}
          ${compareRow(t('variable'), a.totalVariable, b.totalVariable, true)}
          ${compareRow(t('periodic'), a.totalPeriodic, b.totalPeriodic, true)}
          ${compareRow(t('tabungan'), a.totalTabungan, b.totalTabungan)}
          ${compareRow(t('dailyExpenses'), a.totalDaily, b.totalDaily, true)}
          ${compareRow(t('totalOut'), a.totalOut, b.totalOut, true)}
          <tr class="proj-section-header"><td colspan="4">${t('assets')}</td></tr>
          ${compareRow(t('totalCash'), a.totalCash, b.totalCash)}
          ${compareRow(t('totalInvestment'), a.totalInvestment, b.totalInvestment)}
          ${compareRow(t('grandTotal'), a.grandTotal, b.grandTotal)}
          <tr class="proj-section-header"><td colspan="4">${t('cashflow')}</td></tr>
          ${compareRow(t('remainingBeforeSalary'), a.sisaSebelumGajian, b.sisaSebelumGajian)}
          ${compareRow(t('remaining'), a.sisaAkhirBulan, b.sisaAkhirBulan)}
        </tbody>
      </table>
    </div>`;
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
    body.innerHTML = buildCompareTable(a, b);
  } catch {
    body.innerHTML = `<div class="proj-empty"><p>${t('errorLoading') || 'Gagal memuat data.'}</p></div>`;
  }
}

function renderCompareSection(): string {
  if (S.months.length < 2) {
    return `<div class="proj-compare-wrap card section">
      <div class="proj-empty"><p>${t('projectionNeedTwoMonths')}</p></div>
    </div>`;
  }

  const monthOptions = S.months
    .map((m) => `<option value="${m.id}">${monthLabel(m)}</option>`)
    .join('');

  return `
    <div class="proj-compare-wrap card section">
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
      <div id="proj-compare-body"><div class="proj-loading">${t('loading') || 'Memuat...'}</div></div>
    </div>`;
}

// ── Main render ─────────────────────────────────────────────
export function renderProjection(): void {
  const container = document.getElementById('page-projection');
  if (!container) return;

  container.innerHTML = renderPlanSection() + renderCompareSection();

  // Set compare selectors to last two months then load
  if (S.months.length >= 2) {
    const selA = document.getElementById('proj-sel-a') as HTMLSelectElement;
    const selB = document.getElementById('proj-sel-b') as HTMLSelectElement;
    if (selA && selB) {
      selA.value = String(S.months[S.months.length - 2].id);
      selB.value = String(S.months[S.months.length - 1].id);
      loadCompare(parseInt(selA.value), parseInt(selB.value));
    }
  }
}

export function onProjectionSelChange(): void {
  const selA = document.getElementById('proj-sel-a') as HTMLSelectElement | null;
  const selB = document.getElementById('proj-sel-b') as HTMLSelectElement | null;
  if (!selA || !selB) return;
  loadCompare(parseInt(selA.value), parseInt(selB.value));
}
