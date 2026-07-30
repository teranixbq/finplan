// ============================================================
// frontend/navigation.ts — page navigation & tab switching
// ============================================================

import { S } from './state';
import { el } from './utils';
import { t } from './i18n';
import { renderDaily } from './pages/daily';

export function navigate(page: string): void {
  S.currentPage = page;

  document.querySelectorAll('.nav-item[data-page], .bottom-nav-item[data-page]').forEach((b) => {
    const btn = b as HTMLElement;
    btn.classList.toggle('active', btn.dataset['page'] === page);
  });

  const titles: Record<string, string> = {
    home: t('home'),
    setup: t('setup'),
    daily: t('daily'),
  };
  el('page-title').textContent = titles[page] || '';

  if (!S.months.length) return;

  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  const pageEl = el('page-' + page);
  if (pageEl) pageEl.classList.add('active');

  if (page === 'daily') renderDaily();
}

export function switchTab(tab: string): void {
  S.currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach((b) => {
    const btn = b as HTMLElement;
    btn.classList.toggle('active', btn.dataset['tab'] === tab);
  });
  document.querySelectorAll('.tab-panel').forEach((p) => {
    p.classList.toggle('active', p.id === 'tab-' + tab);
  });
}
