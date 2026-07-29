const API = {
  async get(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async post(url, body) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async put(url, body) {
    const r = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async del(url) {
    const r = await fetch(url, { method: 'DELETE' });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
};

const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const _pendingDelete = {};

function confirmDelete(key, onConfirm) {
  if (_pendingDelete[key]) {
    clearTimeout(_pendingDelete[key]);
    delete _pendingDelete[key];
    onConfirm();
  } else {
    toastWarning(t('deleteConfirm'));
    _pendingDelete[key] = setTimeout(() => delete _pendingDelete[key], 3000);
  }
}

let state = {
  months: [],
  activeMonthId: null,
  summary: null,
  assets: [],
  investments: [],
  expenses: [],
  user: null,
};

async function loadUser() {
  try {
    state.user = await API.get('/api/me');
    document.getElementById('user-name').textContent = state.user.name || state.user.email;
  } catch (_) {}
}

async function loadMonths() {
  state.months = await API.get('/api/months');
  renderMonthSelector();
  if (state.months.length > 0) {
    const latest = state.months.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    })[0];
    await selectMonth(latest.id);
  } else {
    renderNoMonth();
  }
}

function renderMonthSelector() {
  const sel = document.getElementById('month-select');
  const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  sel.innerHTML = state.months
    .sort((a, b) => b.year - a.year || b.month - a.month)
    .map(m => `<option value="${m.id}" ${m.id === state.activeMonthId ? 'selected' : ''}>${MONTH_NAMES[m.month]} ${m.year}</option>`)
    .join('');
  if (state.months.length === 0) sel.innerHTML = '<option value="">-</option>';
}

async function selectMonth(id) {
  state.activeMonthId = id;
  renderMonthSelector();
  const [summary, assets, investments, expenses] = await Promise.all([
    API.get(`/api/months/${id}/summary`),
    API.get(`/api/assets/${id}`),
    API.get(`/api/investments/${id}`),
    API.get(`/api/expenses/${id}`),
  ]);
  state.summary = summary;
  state.assets = assets;
  state.investments = investments;
  state.expenses = expenses;
  renderAll();
}

function renderAll() {
  document.getElementById('no-month').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  renderSummary();
  renderAssets();
  renderInvestments();
  renderExpenses();
}

function renderNoMonth() {
  document.getElementById('no-month').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
}

function renderSummary() {
  const s = state.summary;
  document.getElementById('val-total-cash').textContent = fmt(s.totalCash);
  document.getElementById('val-total-investment').textContent = fmt(s.totalInvestment);
  document.getElementById('val-total-out').textContent = fmt(s.totalOut);
  document.getElementById('val-remaining-before').textContent = fmt(s.sisaSebelumGajian);
  document.getElementById('val-remaining').textContent = fmt(s.sisaAkhirBulan);

  const bar = document.getElementById('cashflow-bar');
  const statusEl = document.getElementById('cashflow-status');
  bar.className = 'cashflow-bar';
  if (s.sisaSebelumGajian >= 500000) {
    bar.classList.add('safe');
    statusEl.textContent = t('safe');
  } else if (s.sisaSebelumGajian >= 0) {
    bar.classList.add('warning');
    statusEl.textContent = t('warning');
  } else {
    bar.classList.add('danger');
    statusEl.textContent = t('danger');
  }

  const salaryEl = document.getElementById('salary-info');
  salaryEl.innerHTML = `
    ${t('salaryInfo')} ${s.month.salaryDate} —
    <span
      id="salary-editable"
      style="cursor:pointer;border-bottom:1px dashed currentColor;padding:0 2px;"
      title="${t('edit')}"
      onclick="editSalaryInline()"
    >${fmt(s.month.salary)}</span>
  `;
}

function renderAssets() {
  const tbody = document.getElementById('assets-body');
  if (state.assets.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty">${t('noData')}</td></tr>`;
    return;
  }
  tbody.innerHTML = state.assets.map(a => `
    <tr>
      <td data-label="${t('name')}"><input class="editable-input" value="${a.name}" onchange="updateAsset(${a.id}, 'name', this.value)"></td>
      <td data-label="${t('amount')}" class="td-amount"><input class="editable-input" style="text-align:right" value="${a.amount}" onchange="updateAsset(${a.id}, 'amount', parseFloat(this.value))"></td>
      <td class="td-actions"><button class="btn btn-sm btn-danger" onclick="deleteAsset(${a.id})">${t('delete')}</button></td>
    </tr>`).join('');
}

function renderInvestments() {
  const tbody = document.getElementById('investments-body');
  if (state.investments.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">${t('noData')}</td></tr>`;
    return;
  }
  tbody.innerHTML = state.investments.map(i => `
    <tr>
      <td data-label="${t('name')}"><input class="editable-input" value="${i.name}" onchange="updateInvestment(${i.id}, 'name', this.value)"></td>
      <td data-label="${t('type')}"><span class="badge badge-${i.type}">${t(i.type)}</span></td>
      <td data-label="${t('amount')}" class="td-amount"><input class="editable-input" style="text-align:right" value="${i.amount}" onchange="updateInvestment(${i.id}, 'amount', parseFloat(this.value))"></td>
      <td class="td-actions"><button class="btn btn-sm btn-danger" onclick="deleteInvestment(${i.id})">${t('delete')}</button></td>
    </tr>`).join('');
}

function renderExpenses() {
  const tbody = document.getElementById('expenses-body');
  if (state.expenses.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty">${t('noData')}</td></tr>`;
    return;
  }
  tbody.innerHTML = state.expenses.map(e => `
    <tr class="${e.isActive ? '' : 'td-inactive'}">
      <td data-label="${t('name')}"><input class="editable-input" value="${e.name}" onchange="updateExpense(${e.id}, 'name', this.value)"></td>
      <td data-label="${t('category')}"><span class="badge badge-${e.category}">${t(e.category)}</span></td>
      <td data-label="${t('amount')}" class="td-amount"><input class="editable-input" style="text-align:right" value="${e.amount}" onchange="updateExpense(${e.id}, 'amount', parseFloat(this.value))"></td>
      <td data-label="${t('active')}"><button class="toggle ${e.isActive ? 'on' : ''}" onclick="toggleExpense(${e.id}, ${e.isActive})"></button></td>
      <td class="td-actions"><button class="btn btn-sm btn-danger" onclick="deleteExpense(${e.id})">${t('delete')}</button></td>
    </tr>`).join('');
}

async function updateAsset(id, key, value) {
  try {
    await API.put(`/api/assets/${id}`, { [key]: value });
    await refreshSummary();
    toastSuccess(t('savedSuccess'));
  } catch (e) { toastError(e.message); }
}

async function deleteAsset(id) {
  confirmDelete(`asset-${id}`, async () => {
    try {
      await API.del(`/api/assets/${id}`);
      state.assets = state.assets.filter(a => a.id !== id);
      renderAssets();
      await refreshSummary();
      toastSuccess(t('deletedSuccess'));
    } catch (e) { toastError(e.message); }
  });
}

async function updateInvestment(id, key, value) {
  try {
    await API.put(`/api/investments/${id}`, { [key]: value });
    await refreshSummary();
    toastSuccess(t('savedSuccess'));
  } catch (e) { toastError(e.message); }
}

async function deleteInvestment(id) {
  confirmDelete(`inv-${id}`, async () => {
    try {
      await API.del(`/api/investments/${id}`);
      state.investments = state.investments.filter(i => i.id !== id);
      renderInvestments();
      await refreshSummary();
      toastSuccess(t('deletedSuccess'));
    } catch (e) { toastError(e.message); }
  });
}

async function updateExpense(id, key, value) {
  try {
    await API.put(`/api/expenses/${id}`, { [key]: value });
    await refreshSummary();
    toastSuccess(t('savedSuccess'));
  } catch (e) { toastError(e.message); }
}

async function toggleExpense(id, current) {
  try {
    await API.put(`/api/expenses/${id}`, { isActive: current ? 0 : 1 });
    const exp = state.expenses.find(e => e.id === id);
    if (exp) exp.isActive = current ? 0 : 1;
    renderExpenses();
    await refreshSummary();
  } catch (e) { toastError(e.message); }
}

async function deleteExpense(id) {
  confirmDelete(`exp-${id}`, async () => {
    try {
      await API.del(`/api/expenses/${id}`);
      state.expenses = state.expenses.filter(e => e.id !== id);
      renderExpenses();
      await refreshSummary();
      toastSuccess(t('deletedSuccess'));
    } catch (e) { toastError(e.message); }
  });
}

async function refreshSummary() {
  state.summary = await API.get(`/api/months/${state.activeMonthId}/summary`);
  renderSummary();
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

async function submitAddAsset() {
  const name = document.getElementById('asset-name').value.trim();
  const amount = getAmountValue("asset-amount");
  if (!validate([
    { value: name, message: t('validNameRequired') },
    { value: isNaN(amount) ? '' : amount, message: t('validAmountRequired') },
  ])) return;
  try {
    const result = await API.post('/api/assets', { monthId: state.activeMonthId, name, amount });
    state.assets.push(result);
    renderAssets();
    await refreshSummary();
    closeModal('modal-asset');
    document.getElementById('asset-name').value = '';
    document.getElementById('asset-amount').value = '';
    toastSuccess(t('addAsset'));
  } catch (e) { toastError(e.message); }
}

async function submitAddInvestment() {
  const name = document.getElementById('inv-name').value.trim();
  const type = document.getElementById('inv-type').value;
  const amount = getAmountValue("inv-amount");
  if (!validate([
    { value: name, message: t('validNameRequired') },
    { value: isNaN(amount) ? '' : amount, message: t('validAmountRequired') },
  ])) return;
  try {
    const result = await API.post('/api/investments', { monthId: state.activeMonthId, name, type, amount });
    state.investments.push(result);
    renderInvestments();
    await refreshSummary();
    closeModal('modal-investment');
    document.getElementById('inv-name').value = '';
    document.getElementById('inv-amount').value = '';
    toastSuccess(t('addInvestment'));
  } catch (e) { toastError(e.message); }
}

async function submitAddExpense() {
  const name = document.getElementById('exp-name').value.trim();
  const category = document.getElementById('exp-category').value;
  const amount = getAmountValue("exp-amount");
  if (!validate([
    { value: name, message: t('validNameRequired') },
    { value: isNaN(amount) ? '' : amount, message: t('validAmountRequired') },
  ])) return;
  try {
    const result = await API.post('/api/expenses', { monthId: state.activeMonthId, name, category, amount, isActive: 1 });
    state.expenses.push(result);
    renderExpenses();
    await refreshSummary();
    closeModal('modal-expense');
    document.getElementById('exp-name').value = '';
    document.getElementById('exp-amount').value = '';
    toastSuccess(t('addExpense'));
  } catch (e) { toastError(e.message); }
}

async function submitNewMonth() {
  const month = parseInt(document.getElementById('nm-month').value);
  const year = parseInt(document.getElementById('nm-year').value);
  const salary = getAmountValue("nm-salary");
  const salaryDate = parseInt(document.getElementById('nm-salarydate').value) || 28;
  if (!validate([
    { value: month, message: t('validMonthRequired') },
    { value: year, message: t('validYearRequired') },
  ])) return;
  try {
    const result = await API.post('/api/months', { month, year, salary, salaryDate });
    state.months.push(result);
    closeModal('modal-newmonth');
    toastSuccess(t('newMonth'));
    await selectMonth(result.id);
  } catch (e) {
    toastError(t('monthExists'));
  }
}

async function logout() {
  await fetch('/auth/logout', { method: 'POST' });
  window.location.href = '/login';
}

document.addEventListener('DOMContentLoaded', async () => {
  setLang(currentLang);
  document.getElementById('lang-toggle').textContent = currentLang.toUpperCase();
  document.getElementById('nm-year').value = new Date().getFullYear();
  document.getElementById('nm-month').value = new Date().getMonth() + 1;
  initAllAmountInputs();
  await loadUser();
  await loadMonths();

  document.getElementById('month-select').addEventListener('change', (e) => {
    if (e.target.value) selectMonth(parseInt(e.target.value));
  });

  document.getElementById('lang-toggle').addEventListener('click', () => {
    setLang(currentLang === 'id' ? 'en' : 'id');
    document.getElementById('lang-toggle').textContent = currentLang.toUpperCase();
    if (state.activeMonthId) renderAll();
  });
});

async function editSalaryInline() {
  const s = state.summary;
  const el = document.getElementById('salary-editable');
  if (!el) return;

  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.className = 'editable-input amount-input';
  input.style.cssText = 'width:120px;text-align:right;font-size:inherit;';
  input.value = formatNumber(s.month.salary);
  initAmountInput(input);

  el.replaceWith(input);
  input.focus();
  input.select();

  let saved = false;

  async function saveSalary() {
    if (saved) return;
    saved = true;
    const newSalary = parseNumber(input.value);
    if (newSalary === s.month.salary) { await refreshSummary(); return; }
    try {
      await API.put(`/api/months/${state.activeMonthId}`, { salary: newSalary });
      toastSuccess(t('savedSuccess'));
      await selectMonth(state.activeMonthId);
    } catch (e) { toastError(e.message); await refreshSummary(); }
  }

  input.addEventListener('blur', saveSalary);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { input.blur(); }
    if (e.key === 'Escape') { saved = true; refreshSummary(); }
  });
}
