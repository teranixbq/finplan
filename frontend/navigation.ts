// ============================================================
// frontend/navigation.ts — page navigation & tab switching
// ============================================================

import { S } from './state';
import { el } from './utils';
import { t } from './i18n';
import { renderDaily } from './pages/daily';
import { renderCharts } from './pages/home';
import { renderProjection } from './pages/projection';

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
    projection: t('projectionPage'),
  };
  el('page-title').textContent = titles[page] || '';

  if (!S.months.length) return;

  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  const pageEl = el('page-' + page);
  if (pageEl) pageEl.classList.add('active');

  // render charts AFTER page is visible so canvas has dimensions
  if (page === 'home' && S.summary) {
    requestAnimationFrame(() => renderCharts(S.summary!));
  }
  if (page === 'daily') renderDaily();
  if (page === 'projection') renderProjection();
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
