// ============================================================
// frontend/pages/daily.ts — daily page render
// ============================================================

import { S } from '../state';
import { el, rp, fmtDate, today, CHART_COLORS } from '../utils';
import { t } from '../i18n';

declare const Chart: any;

// ---- filter state ----
let _filterCategory = 'all';
let _filterDateInput = '';

export function applyDailyFilter(): void {
  _filterCategory = (el('daily-filter-category') as HTMLSelectElement).value;
  _filterDateInput = (el('daily-filter-date-input') as HTMLInputElement).value;
  renderDailyList();
}

export function clearDailyFilter(): void {
  _filterCategory = 'all';
  _filterDateInput = '';
  (el('daily-filter-category') as HTMLSelectElement).value = 'all';
  (el('daily-filter-date-input') as HTMLInputElement).value = '';
  renderDailyList();
}

export function renderDaily(): void {
  const s = S.summary;

  // Total Pengeluaran
  const totalDailyEl = el('val-total-daily');
  if (totalDailyEl) totalDailyEl.textContent = rp(s?.totalDaily || 0);

  // Total Pemasukan
  const totalIncomeEl = el('val-total-income-daily');
  const totalIncome = S.incomes.reduce((sum, inc) => sum + inc.amount, 0);
  if (totalIncomeEl) totalIncomeEl.textContent = rp(totalIncome);

  // Rata-rata Harian
  const avgDailyEl = el('val-avg-daily-2');
  if (avgDailyEl) avgDailyEl.textContent = rp(s?.avgDailyExpense || 0);

  // populate category filter with active expense refs
  populateCategoryFilter();

  renderDailyList();
  requestAnimationFrame(() => renderDailyChart());
  renderIncomeTable();
}

function populateCategoryFilter(): void {
  const sel = el('daily-filter-category') as HTMLSelectElement;
  if (!sel) return;
  const currentVal = sel.value;
  sel.innerHTML = `<option value="all">${t('all') || 'Semua'}</option>`;
  S.expenses
    .filter((e) => e.isActive)
    .forEach((e) => {
      const opt = document.createElement('option');
      opt.value = String(e.id);
      opt.textContent = e.name;
      sel.appendChild(opt);
    });
  // restore value if still valid
  if ([...sel.options].some((o) => o.value === currentVal)) sel.value = currentVal;
}

function getFilteredDaily() {
  let items = [...S.daily];

  // filter by category (expense ref)
  if (_filterCategory !== 'all') {
    const expId = parseInt(_filterCategory);
    items = items.filter((d) => d.expenseId === expId);
  }

  // filter by date input (specific date)
  if (_filterDateInput) {
    items = items.filter((d) => d.date === _filterDateInput);
  }

  return items;
}

function renderDailyList(): void {
  const listEl = el('daily-list');
  if (!listEl) return;

  const items = getFilteredDaily();

  if (!items.length) {
    listEl.innerHTML = `<div class="empty-state">${t('noData')}</div>`;
    return;
  }

  // group by date descending
  const grouped: Record<string, typeof items> = {};
  [...items]
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach((d) => {
      if (!grouped[d.date]) grouped[d.date] = [];
      grouped[d.date].push(d);
    });

  listEl.innerHTML = Object.entries(grouped)
    .map(([date, dayItems]) => {
      const dayTotal = dayItems.reduce((s: number, i) => s + i.amount, 0);
      const rows = dayItems
        .map(
          (item) => `
          <div class="daily-item">
            <div class="daily-item-info">
              <span class="daily-item-name">${item.name}</span>
              ${item.note ? `<span class="daily-item-note">${item.note}</span>` : ''}
            </div>
            <div class="daily-item-right">
              <span class="daily-item-amount">${rp(item.amount)}</span>
              <button class="btn-icon danger sm" onclick="window.deleteDaily(${item.id})">${t('delete')}</button>
            </div>
          </div>`,
        )
        .join('');
      return `
      <div class="daily-group">
        <div class="daily-group-header">
          <span class="daily-group-date">${fmtDate(date)}</span>
          <span class="daily-group-total">${rp(dayTotal)}</span>
        </div>
        ${rows}
      </div>`;
    })
    .join('');
}

function renderDailyChart(): void {
  const canvas = el('chart-daily') as HTMLCanvasElement;
  if (!canvas || typeof Chart === 'undefined') return;

  // build per-date aggregates for all data (chart shows full month, not filtered)
  const expenseByDate: Record<string, number> = {};
  const incomeByDate: Record<string, number> = {};

  S.daily.forEach((d) => {
    expenseByDate[d.date] = (expenseByDate[d.date] || 0) + d.amount;
  });
  S.incomes.forEach((inc) => {
    // use inc.date if available, fallback to created_at (unix timestamp -> YYYY-MM-DD)
    const dateKey = (inc as any).date || (() => {
      if (!inc.createdAt) return null;
      return new Date(inc.createdAt * 1000).toISOString().slice(0, 10);
    })();
    if (dateKey) {
      incomeByDate[dateKey] = (incomeByDate[dateKey] || 0) + inc.amount;
    }
  });

  const allDates = [
    ...new Set([...Object.keys(expenseByDate), ...Object.keys(incomeByDate)]),
  ].sort();

  if (!allDates.length) {
    // destroy existing chart if any
    if (S.charts['daily']) {
      (S.charts['daily'] as any).destroy();
      delete S.charts['daily'];
    }
    return;
  }

  const labels = allDates.map((d) => fmtDate(d));
  const expenseData = allDates.map((d) => expenseByDate[d] || 0);
  const incomeData = allDates.map((d) => incomeByDate[d] || 0);

  if (S.charts['daily']) {
    const chart = S.charts['daily'] as any;
    chart.data.labels = labels;
    chart.data.datasets[0].data = expenseData;
    chart.data.datasets[1].data = incomeData;
    chart.update();
    return;
  }

  S.charts['daily'] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: t('totalDaily') || 'Pengeluaran',
          data: expenseData,
          backgroundColor: 'rgba(217,138,127,0.7)',
          borderColor: '#d98a7f',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: t('incomes') || 'Pemasukan',
          data: incomeData,
          backgroundColor: 'rgba(143,184,143,0.7)',
          borderColor: '#8fb88f',
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: { color: CHART_COLORS.text, font: { size: 11 }, boxWidth: 12 },
        },
        tooltip: {
          backgroundColor: 'rgba(18,30,18,0.92)',
          borderColor: 'rgba(180,196,180,0.2)',
          borderWidth: 1,
          padding: 10,
          callbacks: { label: (ctx: any) => ' ' + rp(ctx.parsed.y) },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: CHART_COLORS.text, font: { size: 10 } },
          border: { display: false },
        },
        y: {
          grid: { color: CHART_COLORS.track },
          ticks: {
            color: CHART_COLORS.text,
            font: { size: 10 },
            callback: (v: number) =>
              v >= 1000000 ? v / 1000000 + 'jt' : v >= 1000 ? v / 1000 + 'rb' : v,
          },
          border: { display: false },
        },
      },
    },
  });
}

function renderIncomeTable(): void {
  const tbody = el('daily-incomes-body');
  if (!tbody) return;

  if (!S.incomes.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty">${t('noData')}</td></tr>`;
    return;
  }

  tbody.innerHTML = S.incomes
    .map(
      (inc) => `
    <tr>
      <td>${inc.name}</td>
      <td style="text-align:right">${rp(inc.amount)}</td>
      <td><button class="btn-icon danger sm" onclick="window.deleteIncome(${inc.id})">${t('delete')}</button></td>
    </tr>`,
    )
    .join('');
}
