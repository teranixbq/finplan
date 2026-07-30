// ============================================================
// frontend/state.ts — global app state
// ============================================================

import type {
  Month,
  Asset,
  Expense,
  Investment,
  Income,
  DailyExpense,
  Projection,
  SummaryResponse,
} from '../src/shared/types';

export interface AppState {
  months: Month[];
  currentMonthId: number | null;
  summary: SummaryResponse | null;
  assets: Asset[];
  expenses: Expense[];
  investments: Investment[];
  incomes: Income[];
  daily: DailyExpense[];
  projection: Projection | null;
  currentPage: string;
  currentTab: string;
  deleteConfirm: Record<string, number>;
  charts: Record<string, unknown>;
}

export const S: AppState = {
  months: [],
  currentMonthId: null,
  summary: null,
  assets: [],
  expenses: [],
  investments: [],
  incomes: [],
  daily: [],
  projection: null,
  currentPage: 'home',
  currentTab: 'assets',
  deleteConfirm: {},
  charts: {},
};
