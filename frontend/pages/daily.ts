// ============================================================
// frontend/pages/daily.ts — daily page render
// ============================================================

import { S } from '../state';
import { el, rp, fmtDate } from '../utils';
import { t } from '../i18n';

export function renderDaily(): void {
  const s = S.summary;

  const totalDailyEl = el('val-total-daily');
  if (totalDailyEl) totalDailyEl.textContent = rp(s?.totalDaily || 0);

  const avgDailyEl = el('val-avg-daily-2');
  if (avgDailyEl) avgDailyEl.textContent = rp(s?.avgDailyExpense || 0);

  const busiestEl = el('val-busiest-day');
  if (busiestEl) {
    busiestEl.textContent = s?.busiestDay
      ? `${fmtDate(s.busiestDay.date)} (${rp(s.busiestDay.amount)})`
      : '-';
  }

  const listEl = el('daily-list');
  if (!listEl) return;

  if (!S.daily.length) {
    listEl.innerHTML = `<div class="empty-state">${t('noData')}</div>`;
    return;
  }

  // group by date descending
  const grouped: Record<string, typeof S.daily> = {};
  [...S.daily]
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach((d) => {
      if (!grouped[d.date]) grouped[d.date] = [];
      grouped[d.date].push(d);
    });

  listEl.innerHTML = Object.entries(grouped)
    .map(([date, items]) => {
      const dayTotal = items.reduce((s: number, i) => s + i.amount, 0);
      const rows = items
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
        </div>
      `,
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
