// ============================================================
// frontend/modals.ts — modal open/close + breakdown modal
// ============================================================

import { S } from './state';
import { el, rp } from './utils';

export function openModal(id: string): void {
  el(id).classList.remove('hidden');
}

export function closeModal(id: string): void {
  el(id).classList.add('hidden');
}

export function closeBreakdownModal(e: MouseEvent): void {
  if (e.target === el('modal-breakdown')) closeModal('modal-breakdown');
}

export function showBreakdownModal(type: 'sisaSebelumGajian' | 'sisaAkhirBulan'): void {
  const s = S.summary;
  if (!s) return;
  const titleEl = el('breakdown-modal-title');
  const bodyEl = el('breakdown-modal-body');

  // aggregate actual per kategori dari daily expenses
  const actualByExpenseId: Record<number, number> = {};
  (S.daily || []).forEach((d) => {
    if (d.expenseId) {
      actualByExpenseId[d.expenseId] = (actualByExpenseId[d.expenseId] || 0) + d.amount;
    }
  });
  const manualActual = (S.daily || [])
    .filter((d) => !d.expenseId)
    .reduce((a, d) => a + d.amount, 0);

  if (type === 'sisaSebelumGajian') {
    titleEl.textContent = 'Detail: Sisa Sebelum Gajian';
    bodyEl.innerHTML = `
      <div class="bd-calc-rows">
        <div class="bd-calc-row">
          <span class="bd-calc-label">Dana Cair</span>
          <span class="bd-calc-value">${rp(s.totalCash)}</span>
        </div>
        <div class="bd-calc-row">
          <span class="bd-calc-label">Investasi</span>
          <span class="bd-calc-value">${rp(s.totalInvestment)}</span>
        </div>
        <div class="bd-calc-row bd-calc-subtotal">
          <span class="bd-calc-label">Subtotal Aset</span>
          <span class="bd-calc-value">${rp(s.totalCash + s.totalInvestment)}</span>
        </div>
        <div class="bd-calc-row bd-calc-minus">
          <span class="bd-calc-label">Pengeluaran Harian (aktual)</span>
          <span class="bd-calc-value">- ${rp(s.totalDaily)}</span>
        </div>
        <div class="bd-calc-row bd-calc-result">
          <span class="bd-calc-label">= Sisa Sebelum Gajian</span>
          <span class="bd-calc-value ${s.sisaSebelumGajian >= 0 ? 'positive' : 'negative'}">${rp(s.sisaSebelumGajian)}</span>
        </div>
        <div class="bd-calc-note">
          Manual (tidak terhubung budget): ${rp(manualActual)}
        </div>
      </div>`;
  } else {
    titleEl.textContent = 'Detail: Sisa Akhir Bulan';
    bodyEl.innerHTML = `
      <div class="bd-calc-rows">
        <div class="bd-calc-row">
          <span class="bd-calc-label">Sisa Sebelum Gajian</span>
          <span class="bd-calc-value">${rp(s.sisaSebelumGajian)}</span>
        </div>
        <div class="bd-calc-row bd-calc-plus">
          <span class="bd-calc-label">+ Gaji</span>
          <span class="bd-calc-value">${rp(s.month.salary)}</span>
        </div>
        <div class="bd-calc-row bd-calc-result">
          <span class="bd-calc-label">= Sisa Akhir Bulan</span>
          <span class="bd-calc-value ${s.sisaAkhirBulan >= 0 ? 'positive' : 'negative'}">${rp(s.sisaAkhirBulan)}</span>
        </div>
      </div>`;
  }

  openModal('modal-breakdown');
}
