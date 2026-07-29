const TOAST_TYPES = {
  error:   { color: '#e74c3c' },
  success: { color: '#27ae60' },
  warning: { color: '#f39c12' },
  info:    { color: '#4a90d9' },
};

function getContainer() {
  let c = document.getElementById('toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toast-container';
    document.body.appendChild(c);
  }
  return c;
}

function toast(message, type = 'info', duration = 3000) {
  const container = getContainer();
  const style = TOAST_TYPES[type] || TOAST_TYPES.info;

  const el = document.createElement('div');
  el.className = 'toast toast-' + (TOAST_TYPES[type] ? type : 'info');
  el.innerHTML = `<span class="toast-msg" style="color:${style.color}">${message}</span><button class="toast-close" onclick="this.closest('.toast').remove()">&#10005;</button>`;

  container.appendChild(el);

  requestAnimationFrame(() => el.classList.add('toast-show'));

  if (duration > 0) {
    setTimeout(() => {
      el.classList.remove('toast-show');
      el.classList.add('toast-hide');
      el.addEventListener('transitionend', () => el.remove(), { once: true });
    }, duration);
  }
}

function showToast(msg, type = 'info', duration = 3000) { toast(msg, type, duration); }
function toastError(msg)   { toast(msg, 'error'); }
function toastSuccess(msg) { toast(msg, 'success'); }
function toastWarning(msg) { toast(msg, 'warning'); }
function toastInfo(msg)    { toast(msg, 'info'); }

function validate(fields) {
  for (const { value, message } of fields) {
    const empty = value === null || value === undefined || value === '' || (typeof value === 'number' && isNaN(value));
    if (empty) { toastError(message); return false; }
  }
  return true;
}

function formatNumber(n) {
  return new Intl.NumberFormat('id-ID').format(n);
}

function parseNumber(str) {
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}

function initAmountInput(el) {
  el.setAttribute('type', 'text');
  el.setAttribute('inputmode', 'numeric');

  el.addEventListener('focus', function () {
    const raw = parseNumber(this.value);
    this.value = raw === 0 ? '' : String(raw);
  });

  el.addEventListener('input', function () {
    const pos = this.selectionStart;
    const raw = this.value.replace(/[^\d]/g, '');
    this.value = raw;
    this.setSelectionRange(pos, pos);
  });

  el.addEventListener('blur', function () {
    const raw = parseNumber(this.value);
    this.value = raw === 0 ? '' : formatNumber(raw);
  });
}

function initAllAmountInputs() {
  document.querySelectorAll('.amount-input').forEach(initAmountInput);
}

function getAmountValue(id) {
  const el = document.getElementById(id);
  return parseNumber(el ? el.value : '0');
}
