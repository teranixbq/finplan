// ============================================================
// frontend/utils.ts — shared utility functions
// ============================================================

export const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];
export const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const FULL_MONTH = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

// FontAwesome icon markup per expense category
export const CAT_ICON: Record<string, string> = {
  fixed: '<i class="fa-solid fa-file-lines"></i>',
  variable: '<i class="fa-solid fa-cart-shopping"></i>',
  periodic: '<i class="fa-solid fa-calendar-days"></i>',
  tabungan: '<i class="fa-solid fa-sack-dollar"></i>',
  daily: '<i class="fa-solid fa-calendar-day"></i>',
};

export const CAT_ICON_COLOR: Record<string, string> = {
  fixed: '#8fb88f',
  variable: '#c2d4b0',
  periodic: '#d98a7f',
  tabungan: '#d9b877',
  daily: '#6b9fd9',
};

export const CHART_COLORS = {
  fixed: '#6b8f6b',
  variable: '#8fb88f',
  periodic: '#a3c2a3',
  tabungan: '#5a7a5a',
  daily: '#c2d4b0',
  cash: '#8fb88f',
  invest: '#6b8f6b',
  out: '#d9b877',
  remain: '#a3c2a3',
  track: 'rgba(180,196,180,0.12)',
  text: '#b4c4b4',
};

/** Format number as Rupiah */
export function rp(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return 'Rp0';
  return 'Rp' + Math.round(n).toLocaleString('id-ID');
}

/** Parse amount string with thousand separators */
export function parseAmount(str: string | number): number {
  return parseFloat(String(str).replace(/\./g, '').replace(',', '.')) || 0;
}

/** Returns today's date as YYYY-MM-DD */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Convert Unix timestamp (seconds) to YYYY-MM-DD */
export function fromUnix(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

/** Format YYYY-MM-DD to DD/MM/YYYY */
export function fmtDate(str: string | null | undefined): string {
  if (!str) return '-';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

/** Format full date with day name */
export function fmtFullDate(d: Date): string {
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${FULL_MONTH[d.getMonth()]} ${d.getFullYear()}`;
}

/** Format number input with thousand separators (id-ID) */
export function fmtAmountInput(input: HTMLInputElement): void {
  const raw = input.value.replace(/\./g, '').replace(/\D/g, '');
  const num = parseInt(raw, 10);
  if (!isNaN(num)) {
    input.value = num.toLocaleString('id-ID');
  } else {
    input.value = '';
  }
}

/** Get DOM element by id */
export function el(id: string): HTMLElement {
  return document.getElementById(id) as HTMLElement;
}

/** Days in month */
export function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}
