// ============================================================
// frontend/pages/home.ts — home page render functions
// ============================================================

import { S } from '../state';
import { el, rp, daysInMonth, fmtFullDate, fmtDate, MONTH_NAMES, CHART_COLORS } from '../utils';
import { t } from '../i18n';
import type { SummaryResponse } from '../../src/shared/types';

declare const Chart: any;

export function renderHome(): void {
  const s = S.summary;
  if (!s) return;

  const m = s.month;
  const now = new Date();
  const today_day = now.getDate();
  const days_left =
    m.salaryDate > today_day
      ? m.salaryDate - today_day
      : daysInMonth(now) - today_day + m.salaryDate;

  const pct =
    s.totalOut && s.totalCash ? Math.min(100, Math.round((s.totalOut / s.totalCash) * 100)) : 0;
  const cashflowStatus = pct >= 90 ? 'danger' : pct >= 70 ? 'warning' : 'safe';

  // sisa cards
  const sisaEl = el('val-remaining-before');
  if (sisaEl) sisaEl.textContent = rp(s.sisaSebelumGajian);
  const sisaAkhirEl = el('val-remaining');
  if (sisaAkhirEl) sisaAkhirEl.textContent = rp(s.sisaAkhirBulan);

  // cashflow badge
  const badgeEl = el('income-status-badge');
  if (badgeEl) {
    badgeEl.textContent = t(cashflowStatus);
    badgeEl.className = `income-status-badge ${cashflowStatus}`;
  }

  // total cash & investment
  const cashEl = el('val-total-cash');
  if (cashEl) cashEl.textContent = rp(s.totalCash);
  const investEl = el('val-total-investment');
  if (investEl) investEl.textContent = rp(s.totalInvestment);

  renderSchedule(s, now, today_day, days_left);
  renderCharts(s);
  renderBVA(s);
}

function renderSchedule(s: SummaryResponse, now: Date, today_day: number, days_left: number): void {
  const m = s.month;

  // income card
  const salaryEl = el('val-salary');
  if (salaryEl) salaryEl.textContent = rp(s.totalIncome || 0);
  const incomeSubEl = el('income-sub');
  if (incomeSubEl) incomeSubEl.textContent = `${t('salaryInfo')} ${m.salaryDate} · ${days_left} ${t('daysLeft')}`;

  // schedule card
  const schedNumEl = el('sched-salary-num');
  if (schedNumEl) schedNumEl.textContent = String(m.salaryDate);
  const schedFullEl = el('sched-salary-full');
  if (schedFullEl) schedFullEl.textContent = `${days_left} ${t('daysLeft')}`;
  const schedTodayNumEl = el('sched-today-num');
  if (schedTodayNumEl) schedTodayNumEl.textContent = String(today_day);
  const schedTodayFullEl = el('sched-today-full');
  if (schedTodayFullEl) schedTodayFullEl.textContent = fmtFullDate(now);
  const projItems = proj?.items || [];
  const projTotal = projItems.reduce((s: number, i) => s + i.amount, 0);
  const currentTotal = s.totalBudget;
  const diff = projTotal - currentTotal;

  const projLabelEl = el('proj-target-label');
  if (projLabelEl) {
    const tgt = proj?.target;
    projLabelEl.textContent = tgt ? `${MONTH_NAMES[tgt.month - 1]} ${tgt.year}` : '-';
  }
  const projTotalEl = el('proj-total');
  if (projTotalEl) projTotalEl.textContent = rp(projTotal);
}

function renderBVA(s: SummaryResponse): void {
  const listEl = el('budget-actual-list');
  if (!listEl) return;

  const activeExpenses = S.expenses.filter((e) => e.isActive);
  if (!activeExpenses.length) {
    listEl.innerHTML = `<div class="empty-state">${t('noData')}</div>`;
    return;
  }

  const actualByExpenseId: Record<number, number> = {};
  (S.daily || []).forEach((d) => {
    if (d.expenseId) {
      actualByExpenseId[d.expenseId] = (actualByExpenseId[d.expenseId] || 0) + d.amount;
    }
  });

  let totalActual = 0;
  let totalBudget = 0;

  listEl.innerHTML = activeExpenses
    .map((exp) => {
      const budget = exp.amount;
      const actual = actualByExpenseId[exp.id] || 0;
      totalActual += actual;
      totalBudget += budget;
      const pct = budget > 0 ? Math.min(999, Math.round((actual / budget) * 100)) : 0;
      const over = actual > budget;
      const barColor = over ? '#d98a7f' : pct > 80 ? '#d9b877' : '#8fb88f';
      const pctDisplay = pct > 999 ? '999+' : pct;
      return `
        <div class="bva-row">
          <div class="bva-label">${exp.name}</div>
          <div class="bva-amounts">
            <span class="bva-actual" style="color:${barColor}">${rp(actual)}</span>
            <span class="bva-sep">/</span>
            <span class="bva-budget">${rp(budget)}</span>
          </div>
          <div class="bva-bar-track">
            <div class="bva-bar-fill" style="width:${Math.min(100, pct)}%;background:${barColor};"></div>
          </div>
          <div class="bva-pct" style="color:${barColor}">${pctDisplay}%${over ? ' ⚠' : ''}</div>
        </div>`;
    })
    .join('');

  const footerEl = el('bva-total-footer');
  if (footerEl) {
    const selisih = totalBudget - totalActual;
    const selisihPct = totalBudget > 0 ? Math.round((Math.abs(selisih) / totalBudget) * 100) : 0;
    const overBudget = selisih < 0;
    const selisihColor = overBudget ? '#d98a7f' : '#8fb88f';
    const selisihLabel = overBudget ? 'Over Budget' : 'Sisa Budget';
    footerEl.innerHTML = `
      <div class="bva-total-row">
        <div class="bva-total-item">
          <span class="bva-total-label">${t('totalActual') || 'Total Aktual'}</span>
          <span class="bva-total-value actual">${rp(totalActual)}</span>
        </div>
        <div class="bva-total-divider"></div>
        <div class="bva-total-item">
          <span class="bva-total-label">${t('totalBudget') || 'Total Budget'}</span>
          <span class="bva-total-value budget">${rp(totalBudget)}</span>
        </div>
      </div>
      <div class="bva-selisih-row">
        <span class="bva-selisih-label">${selisihLabel}</span>
        <span class="bva-selisih-value" style="color:${selisihColor}">${overBudget ? '-' : '+'}${rp(Math.abs(selisih))} <span class="bva-selisih-pct">(${selisihPct}%)</span></span>
      </div>`;
  }
}

export function renderCharts(s: SummaryResponse): void {
  if (typeof Chart === 'undefined') return;

  const barCanvas = el('chart-assets') as HTMLCanvasElement;
  if (!barCanvas) return;

  const existingBar = (S.charts as any)['bar'];
  if (existingBar) existingBar.destroy();

  (S.charts as any)['bar'] = new Chart(barCanvas, {
    type: 'bar',
    data: {
      labels: [t('chartCash'), t('chartInvest'), t('chartOut'), t('chartRemain')],
      datasets: [
        {
          data: [s.totalCash, s.totalInvestment, s.totalOut, Math.max(0, s.sisaAkhirBulan)],
          backgroundColor: [
            CHART_COLORS.cash,
            CHART_COLORS.invest,
            CHART_COLORS.out,
            CHART_COLORS.remain,
          ],
          borderRadius: 8,
          borderSkipped: false,
          barPercentage: 0.6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
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
          ticks: { color: CHART_COLORS.text, font: { size: 11 } },
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
