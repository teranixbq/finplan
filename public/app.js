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
  currentPage: 'home',
  currentTab: 'assets',
  deleteConfirm: {},   // { key: timestamp } for double-tap delete
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
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pageEl = el('page-' + page);
  if (pageEl) pageEl.classList.add('active');

  document.querySelectorAll('.nav-item[data-page], .bottom-nav-item[data-page]').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });

  const titles = { home: t('home'), setup: t('setup'), daily: t('daily') };
  el('page-title').textContent = titles[page] || '';

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
    return;
  }
  el('no-month').classList.add('hidden');

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

  const [summary, assets, expenses, investments, incomes, daily] = await Promise.all([
    api('GET', '/months/' + S.currentMonthId + '/summary'),
    api('GET', '/assets'),
    api('GET', '/expenses/' + S.currentMonthId),
    api('GET', '/investments/' + S.currentMonthId),
    api('GET', '/incomes/' + S.currentMonthId),
    api('GET', '/daily/' + S.currentMonthId),
  ]);

  S.summary = summary;
  S.assets = assets;
  S.expenses = expenses;
  S.investments = investments;
  S.incomes = incomes;
  S.daily = daily;

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
  const today_day = new Date().getDate();
  const days_left = m.salaryDate > today_day ? m.salaryDate - today_day : (31 - today_day + m.salaryDate);

  // cashflow bar
  const pct = s.totalOut && s.totalCash ? Math.min(100, Math.round((s.totalOut / s.totalCash) * 100)) : 0;
  let status = 'safe', statusLabel = t('safe');
  if (pct >= 80) { status = 'danger'; statusLabel = t('danger'); }
  else if (pct >= 60) { status = 'warning'; statusLabel = t('warning'); }

  el('cashflow-bar').className = 'cashflow-bar ' + status;
  el('salary-info').textContent = `${t('salaryInfo')} ${m.salaryDate} (${days_left} hari lagi)`;
  el('cashflow-status').textContent = `${statusLabel} ${pct}%`;

  el('val-salary').textContent = rp(m.salary);
  el('val-salary-date').textContent = m.salaryDate;
  el('val-total-cash').textContent = rp(s.totalCash);
  el('val-total-investment').textContent = rp(s.totalInvestment);
  el('val-total-out').textContent = rp(s.totalExpenses);
  el('val-remaining-before').textContent = rp(s.sisaSebelumGajian);
  el('val-remaining').textContent = rp(s.sisaAkhirBulan);
  el('val-avg-daily').textContent = rp(s.avgDailyExpense);

  // breakdown
  const bEl = el('breakdown-content');
  bEl.innerHTML = `
    <div class="breakdown-row"><span>${t('totalFixed')}</span><span>${rp(s.totalFixed)}</span></div>
    <div class="breakdown-row"><span>${t('totalVariable')}</span><span>${rp(s.totalVariable)}</span></div>
    <div class="breakdown-row"><span>${t('totalPeriodic')}</span><span>${rp(s.totalPeriodic)}</span></div>
    <div class="breakdown-row"><span>${t('totalTabungan')}</span><span>${rp(s.totalTabungan)}</span></div>
    <div class="breakdown-row"><span>${t('totalDaily')}</span><span>${rp(s.totalDaily)}</span></div>
    <div class="breakdown-row total"><span>${t('totalOut')}</span><span>${rp(s.totalOut)}</span></div>
  `;

  // incomes
  renderIncomes();
}

function renderIncomes() {
  const tbody = el('incomes-body');
  if (!S.incomes.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">${t('noData')}</td></tr>`;
    return;
  }
  tbody.innerHTML = S.incomes.map(inc => {
    const assetName = S.assets.find(a => a.id === inc.assetId)?.name || '-';
    return `<tr>
      <td>${inc.name}</td>
      <td>${assetName}</td>
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
  const [summary, assets, expenses, investments, incomes, daily] = await Promise.all([
    api('GET', '/months/' + S.currentMonthId + '/summary'),
    api('GET', '/assets'),
    api('GET', '/expenses/' + S.currentMonthId),
    api('GET', '/investments/' + S.currentMonthId),
    api('GET', '/incomes/' + S.currentMonthId),
    api('GET', '/daily/' + S.currentMonthId),
  ]);
  S.summary = summary;
  S.assets = assets;
  S.expenses = expenses;
  S.investments = investments;
  S.incomes = incomes;
  S.daily = daily;
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
