// ============================================================
// FinPlan app.js — state management, API, render, modals
// ============================================================

// ---- STATE -------------------------------------------------
const S = {
  months: [],
  currentMonthId: null,
  summary: null,
  assets: [],
  expenses: [],
  investments: [],
  incomes: [],
  daily: [],
  projection: null,    // { target: {month, year}, items: [] }
  currentPage: 'home',
  currentTab: 'assets',
  deleteConfirm: {},   // { key: timestamp } for double-tap delete
  charts: {},          // chart instances
};

// emoji icons per expense category
const CAT_ICON = {
  fixed:     '\u{1F4C4}', // page (tetap)
  variable:  '\u{1F6D2}', // trolley (variabel)
  periodic:  '\u{1F4C5}', // calendar (periodik)
  tabungan:  '\u{1F4B0}', // money bag (tabungan)
  daily:     '\u{1F5D3}', // spiral calendar (harian)
};

// forest palette for charts (single palette)
const CHART_COLORS = {
  fixed:     '#6b8f6b',
  variable:  '#8fb88f',
  periodic:  '#a3c2a3',
  tabungan:  '#5a7a5a',
  daily:     '#c2d4b0',
  cash:      '#8fb88f',
  invest:    '#6b8f6b',
  out:       '#d9b877',
  remain:    '#a3c2a3',
  track:     'rgba(180,196,180,0.12)',
  text:      '#b4c4b4',
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

// ---- UTILS -------------------------------------------------
function rp(n) {
  if (n === null || n === undefined || isNaN(n)) return 'Rp0';
  return 'Rp' + Math.round(n).toLocaleString('id-ID');
}

function parseAmount(str) {
  return parseFloat(String(str).replace(/\./g, '').replace(',', '.')) || 0;
}

function today() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function fmtDate(str) {
  if (!str) return '-';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

function el(id) { return document.getElementById(id); }

// amount-input: format with dots as thousand separator while typing
document.addEventListener('input', function(e) {
  if (!e.target.classList.contains('amount-input')) return;
  let raw = e.target.value.replace(/\D/g, '');
  if (raw) e.target.value = parseInt(raw, 10).toLocaleString('id-ID');
  else e.target.value = '';
});

// close modal on overlay click
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.add('hidden');
  }
});

// ---- API ---------------------------------------------------
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch('/api' + path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

// ---- NAVIGATION --------------------------------------------
function navigate(page) {
  S.currentPage = page;

  document.querySelectorAll('.nav-item[data-page], .bottom-nav-item[data-page]').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });

  const titles = { home: t('home'), setup: t('setup'), daily: t('daily') };
  el('page-title').textContent = titles[page] || '';

  // In empty mode (no months), keep showing the empty state, not pages
  if (!S.months.length) return;

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pageEl = el('page-' + page);
  if (pageEl) pageEl.classList.add('active');

  if (page === 'daily') renderDaily();
}

function switchTab(tab) {
  S.currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tab));
}

// ---- MODALS ------------------------------------------------
function openModal(id) {
  el(id).classList.remove('hidden');
}
function closeModal(id) {
  el(id).classList.add('hidden');
}

// ---- MONTH SELECT ------------------------------------------
function populateMonthSelect() {
  const sel = el('month-select');
  sel.innerHTML = '';
  if (!S.months.length) return;
  S.months.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${MONTH_NAMES[m.month - 1]} ${m.year}`;
    if (m.id === S.currentMonthId) opt.selected = true;
    sel.appendChild(opt);
  });
}

el('month-select').addEventListener('change', function() {
  S.currentMonthId = parseInt(this.value);
  loadMonthData();
});

// ---- INIT --------------------------------------------------
async function init() {
  // load user info
  try {
    const me = await api('GET', '/me');
    el('user-name').textContent = me.name || '';
    el('user-email').textContent = me.email || '';
  } catch {}

  // lang toggle
  el('lang-toggle').textContent = (localStorage.getItem('fp_lang') || 'id').toUpperCase();
  el('lang-toggle').addEventListener('click', () => {
    const next = (localStorage.getItem('fp_lang') || 'id') === 'id' ? 'en' : 'id';
    setLang(next);
    el('lang-toggle').textContent = next.toUpperCase();
  });

  // set today for daily date input
  el('daily-date').value = today();

  // pre-fill new month with current month/year
  const now = new Date();
  el('nm-month').value = now.getMonth() + 1;
  el('nm-year').value = now.getFullYear();

  await loadMonths();
}

async function loadMonths() {
  S.months = await api('GET', '/months');
  // sort oldest first for carryover, but show newest first in select
  S.months.sort((a, b) => (a.year * 100 + a.month) - (b.year * 100 + b.month));

  if (!S.months.length) {
    el('no-month').classList.remove('hidden');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelector('.main-wrap').classList.add('empty-mode');
    return;
  }
  el('no-month').classList.add('hidden');
  document.querySelector('.main-wrap').classList.remove('empty-mode');
  const activePage = document.querySelector('.page.active');
  if (!activePage) el('page-' + S.currentPage).classList.add('active');

  // default to latest month
  if (!S.currentMonthId || !S.months.find(m => m.id === S.currentMonthId)) {
    S.currentMonthId = S.months[S.months.length - 1].id;
  }

  populateMonthSelect();
  await loadMonthData();
}

async function loadMonthData() {
  if (!S.currentMonthId) return;
  populateMonthSelect();

  const [summary, assets, expenses, investments, incomes, daily, projection] = await Promise.all([
    api('GET', '/months/' + S.currentMonthId + '/summary'),
    api('GET', '/assets'),
    api('GET', '/expenses/' + S.currentMonthId),
    api('GET', '/investments/' + S.currentMonthId),
    api('GET', '/incomes/' + S.currentMonthId),
    api('GET', '/daily/' + S.currentMonthId),
    api('GET', '/projections/' + S.currentMonthId),
  ]);

  S.summary = summary;
  S.assets = assets;
  S.expenses = expenses;
  S.investments = investments;
  S.incomes = incomes;
  S.daily = daily;
  S.projection = projection;

  renderHome();
  renderSetup();
  populateAssetSelects();
  populateDailyExpenseSelect();
}

// ---- RENDER HOME -------------------------------------------
function renderHome() {
  const s = S.summary;
  if (!s) return;

  const m = s.month;
  const now = new Date();
  const today_day = now.getDate();
  const days_left = m.salaryDate > today_day ? m.salaryDate - today_day : (daysInMonth(now) - today_day + m.salaryDate);

  // cashflow status (safe/warning/danger) — shown inside income card
  const pct = s.totalOut && s.totalCash ? Math.min(100, Math.round((s.totalOut / s.totalCash) * 100)) : 0;
  let status = 'safe', statusLabel = t('safe');
  if (pct >= 80) { status = 'danger'; statusLabel = t('danger'); }
  else if (pct >= 60) { status = 'warning'; statusLabel = t('warning'); }

  // ----- INCOME CARD -----
  el('val-salary').textContent = rp(m.salary);
  el('income-sub').textContent = `${t('salaryInfo')} ${m.salaryDate} (${days_left} ${t('daysLeft')})`;
  const dot = el('income-status-dot');
  if (dot) dot.className = 'status-dot ' + status;
  el('income-status-text').textContent = `${statusLabel} ${pct}%`;

  // ----- SALARY SCHEDULE CARD -----
  renderSchedule(m, now, today_day, days_left);

  // setup manage bar
  const sSal = el('setup-salary-value'); if (sSal) sSal.textContent = rp(m.salary);
  const sDate = el('setup-salarydate-value'); if (sDate) sDate.textContent = m.salaryDate;
  el('val-total-cash').textContent = rp(s.totalCash);
  el('val-total-investment').textContent = rp(s.totalInvestment);
  el('val-remaining-before').textContent = rp(s.sisaSebelumGajian);
  el('val-remaining').textContent = rp(s.sisaAkhirBulan);

  // breakdown — icons represent categories (no explicit category names beyond label)
  const bEl = el('breakdown-content');
  const brow = (icon, label, val) => `
    <div class="breakdown-row">
      <span class="bd-left"><span class="bd-icon">${icon}</span><span>${label}</span></span>
      <span>${rp(val)}</span>
    </div>`;
  bEl.innerHTML =
    brow(CAT_ICON.fixed,    t('totalFixed'),    s.totalFixed) +
    brow(CAT_ICON.variable, t('totalVariable'), s.totalVariable) +
    brow(CAT_ICON.periodic, t('totalPeriodic'), s.totalPeriodic) +
    brow(CAT_ICON.tabungan, t('totalTabungan'), s.totalTabungan) +
    brow(CAT_ICON.daily,    t('totalDaily'),    s.totalDaily) +
    `<div class="breakdown-row total"><span>${t('totalOut')}</span><span>${rp(s.totalOut)}</span></div>`;

  // charts
  renderCharts(s);

  // incomes
  renderIncomes();
}

// days in a given month (from a Date object)
function daysInMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const FULL_MONTH = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function fmtFullDate(d) {
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${FULL_MONTH[d.getMonth()]} ${d.getFullYear()}`;
}

// ---- SALARY SCHEDULE & PROJECTION (top-right card) --------
function renderSchedule(m, now, today_day, days_left) {
  // today number + full date
  el('sched-today-num').textContent = today_day;
  el('sched-today-full').textContent = fmtFullDate(now);

  // salary date: this month if not passed, else next month
  let salDate;
  if (m.salaryDate >= today_day) {
    salDate = new Date(now.getFullYear(), now.getMonth(), m.salaryDate);
  } else {
    salDate = new Date(now.getFullYear(), now.getMonth() + 1, m.salaryDate);
  }
  el('sched-salary-num').textContent = m.salaryDate;
  el('sched-salary-full').textContent = fmtFullDate(salDate);

  // countdown
  el('sched-countdown').textContent = `${days_left} ${t('daysLeft')}`;

  // upcoming cashflow projection: salary in (gaji pokok) → total
  const list = el('schedule-proj-list');
  const dLabel = `${salDate.getDate()} ${MONTH_NAMES[salDate.getMonth()]}`;
  list.innerHTML = `
    <div class="sched-proj-row">
      <span>${dLabel}</span>
      <span data-i18n="basicSalary">Gaji Pokok</span>
      <span class="sched-proj-amt">${rp(m.salary)}</span>
    </div>
    <div class="sched-proj-row total">
      <span>${dLabel}</span>
      <span data-i18n="total">Total</span>
      <span class="sched-proj-amt">${rp(m.salary)}</span>
    </div>
  `;
}

// ---- CHARTS ------------------------------------------------
function renderCharts(s) {
  if (typeof Chart === 'undefined') return;

  // ----- DONUT: expense composition -----
  const segs = [
    { key: 'totalFixed',    label: t('totalFixed'),    val: s.totalFixed,    color: CHART_COLORS.fixed },
    { key: 'totalVariable', label: t('totalVariable'), val: s.totalVariable, color: CHART_COLORS.variable },
    { key: 'totalPeriodic', label: t('totalPeriodic'), val: s.totalPeriodic, color: CHART_COLORS.periodic },
    { key: 'totalTabungan', label: t('totalTabungan'), val: s.totalTabungan, color: CHART_COLORS.tabungan },
    { key: 'totalDaily',    label: t('totalDaily'),    val: s.totalDaily,    color: CHART_COLORS.daily },
  ].filter(x => x.val > 0);

  el('chart-center-total').textContent = rp(s.totalOut);

  const donutCanvas = el('chart-breakdown');
  const hasData = segs.length > 0;
  const data = hasData ? segs.map(x => x.val) : [1];
  const colors = hasData ? segs.map(x => x.color) : [CHART_COLORS.track];

  if (S.charts.donut) S.charts.donut.destroy();
  S.charts.donut = new Chart(donutCanvas, {
    type: 'doughnut',
    data: {
      labels: hasData ? segs.map(x => x.label) : [t('noData')],
      datasets: [{
        data,
        backgroundColor: colors,
        borderColor: 'rgba(18,30,18,0.6)',
        borderWidth: 2,
        hoverOffset: 6,
      }],
    },
    options: {
      cutout: '72%',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: hasData,
          backgroundColor: 'rgba(18,30,18,0.92)',
          borderColor: 'rgba(180,196,180,0.2)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: (ctx) => ' ' + ctx.label + ': ' + rp(ctx.parsed),
          },
        },
      },
    },
  });

  // legend
  const legendEl = el('chart-legend');
  legendEl.innerHTML = hasData ? segs.map(x =>
    `<div class="legend-item">
      <span class="legend-dot" style="background:${x.color}"></span>
      <span>${x.label}</span>
      <span class="legend-val">${rp(x.val)}</span>
    </div>`
  ).join('') : `<div class="legend-item"><span>${t('noData')}</span></div>`;

  // ----- BAR: assets & cashflow -----
  const barCanvas = el('chart-assets');
  if (S.charts.bar) S.charts.bar.destroy();
  S.charts.bar = new Chart(barCanvas, {
    type: 'bar',
    data: {
      labels: [t('chartCash'), t('chartInvest'), t('chartOut'), t('chartRemain')],
      datasets: [{
        data: [s.totalCash, s.totalInvestment, s.totalOut, Math.max(0, s.sisaAkhirBulan)],
        backgroundColor: [CHART_COLORS.cash, CHART_COLORS.invest, CHART_COLORS.out, CHART_COLORS.remain],
        borderRadius: 8,
        borderSkipped: false,
        barPercentage: 0.6,
      }],
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
          callbacks: { label: (ctx) => ' ' + rp(ctx.parsed.y) },
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
            callback: (v) => v >= 1000000 ? (v/1000000)+'jt' : v >= 1000 ? (v/1000)+'rb' : v,
          },
          border: { display: false },
        },
      },
    },
  });
}

// ---- EDIT SALARY -------------------------------------------
function openEditSalary() {
  if (!S.summary || !S.summary.month) return;
  const m = S.summary.month;
  el('edit-salary').value = m.salary ? Math.round(m.salary).toLocaleString('id-ID') : '';
  el('edit-salarydate').value = m.salaryDate || 28;
  openModal('modal-salary');
}

async function submitEditSalary() {
  const salary = parseAmount(el('edit-salary').value);
  const salaryDate = parseInt(el('edit-salarydate').value) || 28;
  if (!S.currentMonthId) return showToast(t('validMonthRequired'), 'error');

  try {
    await api('PUT', '/months/' + S.currentMonthId, { salary, salaryDate });
    closeModal('modal-salary');
    showToast(t('savedSuccess'), 'success');
    await reloadAll();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function renderIncomes() {
  const tbody = el('incomes-body');
  if (!S.incomes.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty">${t('noData')}</td></tr>`;
    return;
  }
  tbody.innerHTML = S.incomes.map(inc => {
    return `<tr>
      <td>${inc.name}</td>
      <td style="text-align:right">${rp(inc.amount)}</td>
      <td><button class="btn-icon danger" onclick="deleteIncome(${inc.id})">${t('delete')}</button></td>
    </tr>`;
  }).join('');
}

// ---- RENDER SETUP ------------------------------------------
function renderSetup() {
  renderAssets();
  renderInvestments();
  renderExpenses();
  renderProjection();
}

function renderProjection() {
  const tbody = el('projection-body');
  if (!tbody) return;
  const proj = S.projection;
  const items = proj?.items || [];

  const tgt = proj?.target;
  const lbl = el('proj-target-label');
  if (lbl) lbl.textContent = tgt ? `${MONTH_NAMES[tgt.month - 1]} ${tgt.year}` : '-';

  const total = items.reduce((s, i) => s + i.amount, 0);
  const totalEl = el('proj-total');
  if (totalEl) totalEl.textContent = rp(total);

  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty">${t('noProjection')}</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map(it => {
    const assetName = S.assets.find(a => a.id === it.assetId)?.name || '-';
    return `<tr>
      <td><span class="bd-left"><span class="bd-icon">${CAT_ICON[it.category] || ''}</span><span>${it.name}</span></span></td>
      <td>${t(it.category)}</td>
      <td>${assetName}</td>
      <td style="text-align:right">${rp(it.amount)}</td>
      <td class="row-actions">
        <button class="btn-icon" onclick="editProjection(${it.id})">${t('edit')}</button>
        <button class="btn-icon danger" onclick="deleteProjection(${it.id})">${t('delete')}</button>
      </td>
    </tr>`;
  }).join('');
}

function renderAssets() {
  const tbody = el('assets-body');
  if (!S.assets.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty">${t('noData')}</td></tr>`;
    return;
  }
  tbody.innerHTML = S.assets.map(a => `
    <tr>
      <td>${a.name}</td>
      <td style="text-align:right">${rp(a.amount)}</td>
      <td><button class="btn-icon danger" onclick="deleteAsset(${a.id})">${t('delete')}</button></td>
    </tr>
  `).join('');
}

function renderInvestments() {
  const tbody = el('investments-body');
  if (!S.investments.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">${t('noData')}</td></tr>`;
    return;
  }
  tbody.innerHTML = S.investments.map(inv => `
    <tr>
      <td>${inv.name}</td>
      <td>${t(inv.type)}</td>
      <td style="text-align:right">${rp(inv.amount)}</td>
      <td><button class="btn-icon danger" onclick="deleteInvestment(${inv.id})">${t('delete')}</button></td>
    </tr>
  `).join('');
}

function renderExpenses() {
  const tbody = el('expenses-body');
  if (!S.expenses.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">${t('noData')}</td></tr>`;
    return;
  }
  tbody.innerHTML = S.expenses.map(exp => {
    const assetName = S.assets.find(a => a.id === exp.assetId)?.name || '-';
    let periodNote = '';
    if (exp.category === 'periodic' && exp.periodMonths) {
      periodNote = ` <span class="badge">${exp.periodMonths}x/${exp.periodType === 'year' ? 'thn' : 'bln'}</span>`;
    }
    return `<tr>
      <td>${exp.name}${periodNote}</td>
      <td>${t(exp.category)}</td>
      <td>${assetName}</td>
      <td style="text-align:right">${rp(exp.amount)}</td>
      <td>
        <button class="toggle-btn ${exp.isActive ? 'active' : 'inactive'}" onclick="toggleExpense(${exp.id}, ${exp.isActive})">
          ${exp.isActive ? t('active') : t('inactive')}
        </button>
      </td>
      <td><button class="btn-icon danger" onclick="deleteExpense(${exp.id})">${t('delete')}</button></td>
    </tr>`;
  }).join('');
}

// ---- RENDER DAILY ------------------------------------------
function renderDaily() {
  const s = S.summary;

  el('val-total-daily').textContent = rp(s?.totalDaily || 0);
  el('val-avg-daily-2').textContent = rp(s?.avgDailyExpense || 0);

  if (s?.busiestDay) {
    el('val-busiest-day').textContent = `${fmtDate(s.busiestDay.date)} (${rp(s.busiestDay.amount)})`;
  } else {
    el('val-busiest-day').textContent = '-';
  }

  const listEl = el('daily-list');
  if (!S.daily.length) {
    listEl.innerHTML = `<div class="empty-state">${t('noData')}</div>`;
    return;
  }

  // group by date descending
  const grouped = {};
  [...S.daily].sort((a, b) => b.date.localeCompare(a.date)).forEach(d => {
    if (!grouped[d.date]) grouped[d.date] = [];
    grouped[d.date].push(d);
  });

  listEl.innerHTML = Object.entries(grouped).map(([date, items]) => {
    const dayTotal = items.reduce((s, i) => s + i.amount, 0);
    const rows = items.map(item => `
      <div class="daily-item">
        <div class="daily-item-info">
          <span class="daily-item-name">${item.name}</span>
          ${item.note ? `<span class="daily-item-note">${item.note}</span>` : ''}
        </div>
        <div class="daily-item-right">
          <span class="daily-item-amount">${rp(item.amount)}</span>
          <button class="btn-icon danger sm" onclick="deleteDaily(${item.id})">${t('delete')}</button>
        </div>
      </div>
    `).join('');
    return `
      <div class="daily-group">
        <div class="daily-group-header">
          <span class="daily-group-date">${fmtDate(date)}</span>
          <span class="daily-group-total">${rp(dayTotal)}</span>
        </div>
        ${rows}
      </div>
    `;
  }).join('');
}

// ---- POPULATE SELECTS --------------------------------------
function populateAssetSelects() {
  const opts = S.assets.map(a => `<option value="${a.id}">${a.name} (${rp(a.amount)})</option>`).join('');
  const emptyOpt = `<option value="">- Pilih -</option>`;

  el('exp-asset').innerHTML = emptyOpt + opts;
  el('inc-asset').innerHTML = `<option value="">- Pilih Sumber -</option>` + opts;
  const projAsset = el('proj-asset');
  if (projAsset) projAsset.innerHTML = emptyOpt + opts;
}

function populateDailyExpenseSelect() {
  const opts = S.expenses.filter(e => e.isActive).map(e =>
    `<option value="${e.id}" data-amount="${e.amount}">${e.name}</option>`
  ).join('');
  el('daily-expense-ref').innerHTML = `<option value="">Manual</option>` + opts;
}

// ---- EXPENSE CATEGORY CHANGE --------------------------------
function onExpenseCategoryChange() {
  const cat = el('exp-category').value;
  el('periodic-fields').classList.toggle('hidden', cat !== 'periodic');
}

// ---- DAILY EXPENSE REF CHANGE ------------------------------
function onDailyExpenseRefChange() {
  const sel = el('daily-expense-ref');
  const opt = sel.options[sel.selectedIndex];
  if (opt && opt.value) {
    el('daily-name').value = opt.textContent;
    const amt = opt.dataset.amount || '';
    el('daily-amount').value = amt ? parseInt(amt).toLocaleString('id-ID') : '';
  } else {
    el('daily-name').value = '';
    el('daily-amount').value = '';
  }
}

// ---- SUBMIT: NEW MONTH -------------------------------------
async function submitNewMonth() {
  const month = parseInt(el('nm-month').value);
  const year = parseInt(el('nm-year').value);
  const salary = parseAmount(el('nm-salary').value);
  const salaryDate = parseInt(el('nm-salarydate').value) || 28;

  if (!year) return showToast(t('validYearRequired'), 'error');

  try {
    await api('POST', '/months', { month, year, salary, salaryDate });
    closeModal('modal-newmonth');
    el('nm-salary').value = '';
    showToast(t('savedSuccess'), 'success');
    await loadMonths();
    // switch to latest month
    S.currentMonthId = S.months[S.months.length - 1].id;
    populateMonthSelect();
    await loadMonthData();
  } catch (e) {
    showToast(e.message || t('monthExists'), 'error');
  }
}

// ---- SUBMIT: ADD ASSET -------------------------------------
async function submitAddAsset() {
  const name = el('asset-name').value.trim();
  const amount = parseAmount(el('asset-amount').value);
  if (!name) return showToast(t('validNameRequired'), 'error');

  try {
    await api('POST', '/assets', { name, amount });
    closeModal('modal-asset');
    el('asset-name').value = '';
    el('asset-amount').value = '';
    showToast(t('savedSuccess'), 'success');
    await reloadAll();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function deleteAsset(id) {
  if (!confirmDelete('asset-' + id)) return;
  try {
    await api('DELETE', '/assets/' + id);
    showToast(t('deletedSuccess'), 'success');
    await reloadAll();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ---- SUBMIT: ADD INVESTMENT --------------------------------
async function submitAddInvestment() {
  const name = el('inv-name').value.trim();
  const type = el('inv-type').value;
  const amount = parseAmount(el('inv-amount').value);
  if (!name) return showToast(t('validNameRequired'), 'error');
  if (!S.currentMonthId) return showToast(t('validMonthRequired'), 'error');

  try {
    await api('POST', '/investments', { monthId: S.currentMonthId, name, type, amount });
    closeModal('modal-investment');
    el('inv-name').value = '';
    el('inv-amount').value = '';
    showToast(t('savedSuccess'), 'success');
    await reloadAll();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function deleteInvestment(id) {
  if (!confirmDelete('inv-' + id)) return;
  try {
    await api('DELETE', '/investments/' + id);
    showToast(t('deletedSuccess'), 'success');
    await reloadAll();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ---- SUBMIT: ADD EXPENSE -----------------------------------
async function submitAddExpense() {
  const name = el('exp-name').value.trim();
  const category = el('exp-category').value;
  const assetId = el('exp-asset').value ? parseInt(el('exp-asset').value) : undefined;
  const amount = parseAmount(el('exp-amount').value);
  if (!name) return showToast(t('validNameRequired'), 'error');
  if (!amount) return showToast(t('validAmountRequired'), 'error');
  if (!S.currentMonthId) return showToast(t('validMonthRequired'), 'error');

  const body = { monthId: S.currentMonthId, name, category, amount, isActive: 1 };
  if (assetId) body.assetId = assetId;
  if (category === 'periodic') {
    const pv = parseInt(el('exp-period-value').value) || 1;
    const pt = el('exp-period-type').value;
    body.periodMonths = pv;
    body.periodType = pt;
  }

  try {
    await api('POST', '/expenses', body);
    closeModal('modal-expense');
    el('exp-name').value = '';
    el('exp-amount').value = '';
    el('exp-period-value').value = '1';
    el('periodic-fields').classList.add('hidden');
    showToast(t('savedSuccess'), 'success');
    await reloadAll();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function toggleExpense(id, currentActive) {
  try {
    await api('PUT', '/expenses/' + id, { isActive: currentActive ? 0 : 1 });
    await reloadAll();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function deleteExpense(id) {
  if (!confirmDelete('exp-' + id)) return;
  try {
    await api('DELETE', '/expenses/' + id);
    showToast(t('deletedSuccess'), 'success');
    await reloadAll();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ---- SUBMIT: ADD INCOME ------------------------------------
async function submitAddIncome() {
  const name = el('inc-name').value.trim();
  const amount = parseAmount(el('inc-amount').value);
  const assetId = el('inc-asset').value ? parseInt(el('inc-asset').value) : undefined;
  if (!name) return showToast(t('validNameRequired'), 'error');
  if (!amount) return showToast(t('validAmountRequired'), 'error');
  if (!S.currentMonthId) return showToast(t('validMonthRequired'), 'error');

  const body = { monthId: S.currentMonthId, name, amount };
  if (assetId) body.assetId = assetId;

  try {
    await api('POST', '/incomes', body);
    closeModal('modal-income');
    el('inc-name').value = '';
    el('inc-amount').value = '';
    el('inc-asset').value = '';
    showToast(t('savedSuccess'), 'success');
    await reloadAll();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function deleteIncome(id) {
  if (!confirmDelete('inc-' + id)) return;
  try {
    await api('DELETE', '/incomes/' + id);
    showToast(t('deletedSuccess'), 'success');
    await reloadAll();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ---- PROJECTION (next month plan) --------------------------
function openProjectionModal() {
  el('proj-id').value = '';
  el('proj-name').value = '';
  el('proj-category').value = 'fixed';
  el('proj-asset').value = '';
  el('proj-amount').value = '';
  el('proj-modal-title').textContent = t('addProjection');
  openModal('modal-projection');
}

function editProjection(id) {
  const it = (S.projection?.items || []).find(x => x.id === id);
  if (!it) return;
  el('proj-id').value = it.id;
  el('proj-name').value = it.name;
  el('proj-category').value = it.category;
  el('proj-asset').value = it.assetId || '';
  el('proj-amount').value = it.amount ? Math.round(it.amount).toLocaleString('id-ID') : '';
  el('proj-modal-title').textContent = t('editProjection');
  openModal('modal-projection');
}

async function submitProjection() {
  const id = el('proj-id').value;
  const name = el('proj-name').value.trim();
  const category = el('proj-category').value;
  const assetId = el('proj-asset').value ? parseInt(el('proj-asset').value) : undefined;
  const amount = parseAmount(el('proj-amount').value);
  if (!name) return showToast(t('validNameRequired'), 'error');
  if (!amount) return showToast(t('validAmountRequired'), 'error');
  if (!S.projection?.target) return showToast(t('validMonthRequired'), 'error');

  try {
    if (id) {
      await api('PUT', '/projections/' + id, { name, category, amount, assetId: assetId ?? null });
    } else {
      await api('POST', '/projections', {
        targetMonth: S.projection.target.month,
        targetYear: S.projection.target.year,
        name, category, amount, assetId,
      });
    }
    closeModal('modal-projection');
    showToast(t('savedSuccess'), 'success');
    await reloadAll();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function deleteProjection(id) {
  if (!confirmDelete('proj-' + id)) return;
  try {
    await api('DELETE', '/projections/' + id);
    showToast(t('deletedSuccess'), 'success');
    await reloadAll();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function resetProjection() {
  const key = 'proj-reset';
  const now = Date.now();
  if (!(S.deleteConfirm[key] && now - S.deleteConfirm[key] < 3000)) {
    S.deleteConfirm[key] = now;
    showToast(t('resetConfirm'), 'warning');
    return;
  }
  delete S.deleteConfirm[key];
  try {
    await api('POST', '/projections/' + S.currentMonthId + '/reset');
    showToast(t('savedSuccess'), 'success');
    await reloadAll();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ---- SUBMIT: ADD DAILY -------------------------------------
async function submitAddDaily() {
  const date = el('daily-date').value;
  const name = el('daily-name').value.trim();
  const amount = parseAmount(el('daily-amount').value);
  const note = el('daily-note').value.trim();
  const expenseRef = el('daily-expense-ref').value;

  if (!date) return showToast(t('validDateRequired'), 'error');
  if (!name) return showToast(t('validNameRequired'), 'error');
  if (!amount) return showToast(t('validAmountRequired'), 'error');
  if (!S.currentMonthId) return showToast(t('validMonthRequired'), 'error');

  const body = { monthId: S.currentMonthId, date, name, amount };
  if (note) body.note = note;
  if (expenseRef) body.expenseId = parseInt(expenseRef);

  try {
    await api('POST', '/daily', body);
    closeModal('modal-daily');
    el('daily-name').value = '';
    el('daily-amount').value = '';
    el('daily-note').value = '';
    el('daily-expense-ref').value = '';
    el('daily-date').value = today();
    showToast(t('savedSuccess'), 'success');
    await reloadAll();
    if (S.currentPage === 'daily') renderDaily();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function deleteDaily(id) {
  if (!confirmDelete('daily-' + id)) return;
  try {
    await api('DELETE', '/daily/' + id);
    showToast(t('deletedSuccess'), 'success');
    await reloadAll();
    renderDaily();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ---- RELOAD ALL -------------------------------------------
async function reloadAll() {
  if (!S.currentMonthId) return;
  const [summary, assets, expenses, investments, incomes, daily, projection] = await Promise.all([
    api('GET', '/months/' + S.currentMonthId + '/summary'),
    api('GET', '/assets'),
    api('GET', '/expenses/' + S.currentMonthId),
    api('GET', '/investments/' + S.currentMonthId),
    api('GET', '/incomes/' + S.currentMonthId),
    api('GET', '/daily/' + S.currentMonthId),
    api('GET', '/projections/' + S.currentMonthId),
  ]);
  S.summary = summary;
  S.assets = assets;
  S.expenses = expenses;
  S.investments = investments;
  S.incomes = incomes;
  S.daily = daily;
  S.projection = projection;
  renderHome();
  renderSetup();
  populateAssetSelects();
  populateDailyExpenseSelect();
  if (S.currentPage === 'daily') renderDaily();
}

// ---- DOUBLE-TAP DELETE CONFIRM ----------------------------
function confirmDelete(key) {
  const now = Date.now();
  if (S.deleteConfirm[key] && now - S.deleteConfirm[key] < 3000) {
    delete S.deleteConfirm[key];
    return true;
  }
  S.deleteConfirm[key] = now;
  showToast(t('deleteConfirm'), 'warning');
  return false;
}

// ---- LOGOUT -----------------------------------------------
async function logout() {
  await fetch('/auth/logout', { method: 'POST' });
  window.location.href = '/login';
}

// ---- START ------------------------------------------------
document.addEventListener('DOMContentLoaded', init);
