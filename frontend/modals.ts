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
      <div class="struk-wrap">
        <div class="struk-header">
          <div class="struk-header-title">RINCIAN PERHITUNGAN</div>
          <div class="struk-header-sub">Sisa Sebelum Gajian</div>
        </div>
        <hr class="struk-divider">
        <div class="struk-row">
          <span class="struk-label">Dana Cair</span>
          <span class="struk-val">${rp(s.totalCash)}</span>
        </div>
        <div class="struk-row">
          <span class="struk-label">Investasi</span>
          <span class="struk-val">${rp(s.totalInvestment)}</span>
        </div>
        <hr class="struk-divider">
        <div class="struk-row subtotal">
          <span class="struk-label">SUBTOTAL ASET</span>
          <span class="struk-val">${rp(s.totalCash + s.totalInvestment)}</span>
        </div>
        <hr class="struk-divider">
        <div class="struk-row minus">
          <span class="struk-label">Pengeluaran Terencana</span>
          <span class="struk-val">- ${rp(s.totalDaily - manualActual)}</span>
        </div>
        <div class="struk-row minus">
          <span class="struk-label">Pengeluaran Manual</span>
          <span class="struk-val">- ${rp(manualActual)}</span>
        </div>
        <hr class="struk-divider solid">
        <div class="struk-total-row">
          <span class="struk-total-label">SISA</span>
          <span class="struk-total-val ${s.sisaSebelumGajian >= 0 ? 'positive' : 'negative'}">${rp(s.sisaSebelumGajian)}</span>
        </div>
      </div>`;
  } else {
    titleEl.textContent = 'Detail: Sisa Akhir Bulan';
    bodyEl.innerHTML = `
      <div class="struk-wrap">
        <div class="struk-header">
          <div class="struk-header-title">RINCIAN PERHITUNGAN</div>
          <div class="struk-header-sub">Sisa Akhir Bulan</div>
        </div>
        <hr class="struk-divider">
        <div class="struk-row">
          <span class="struk-label">Sisa Sebelum Gajian</span>
          <span class="struk-val">${rp(s.sisaSebelumGajian)}</span>
        </div>
        <div class="struk-row plus">
          <span class="struk-label">Gaji</span>
          <span class="struk-val">+ ${rp(s.month.salary)}</span>
        </div>
        <hr class="struk-divider solid">
        <div class="struk-total-row">
          <span class="struk-total-label">TOTAL</span>
          <span class="struk-total-val ${s.sisaAkhirBulan >= 0 ? 'positive' : 'negative'}">${rp(s.sisaAkhirBulan)}</span>
        </div>
      </div>`;
  }

  openModal('modal-breakdown');
}
