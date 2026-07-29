const TOAST_TYPES = {
  error:   { bg: 'rgba(248,81,73,0.12)',  border: 'rgba(248,81,73,0.35)',  color: '#f85149' },
  success: { bg: 'rgba(63,185,80,0.12)',  border: 'rgba(63,185,80,0.35)',  color: '#3fb950' },
  warning: { bg: 'rgba(210,153,34,0.12)', border: 'rgba(210,153,34,0.35)', color: '#d29922' },
  info:    { bg: 'rgba(88,166,255,0.12)', border: 'rgba(88,166,255,0.35)', color: '#58a6ff' },
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
  el.className = 'toast';
  el.style.cssText = `background:${style.bg};border:1px solid ${style.border};color:${style.color};`;
  el.innerHTML = `<span class="toast-msg">${message}</span><button class="toast-close" onclick="this.closest('.toast').remove()">&#10005;</button>`;

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
