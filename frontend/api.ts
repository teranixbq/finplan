// ============================================================
// frontend/api.ts — typed fetch wrapper
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
  MeResponse,
} from '../src/shared/types';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch('/api' + path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || res.statusText);
  return data as T;
}

// ---- Months ----
export const getMonths = () => request<Month[]>('GET', '/months');
export const postMonth = (body: {
  month: number;
  year: number;
  salary: number;
  salaryDate: number;
}) => request<Month>('POST', '/months', body);
export const putMonth = (id: number, body: { salary?: number; salaryDate?: number }) =>
  request<Month>('PUT', `/months/${id}`, body);
export const getSummary = (monthId: number) =>
  request<SummaryResponse>('GET', `/months/${monthId}/summary`);

// ---- Assets ----
export const getAssets = () => request<Asset[]>('GET', '/assets');
export const postAsset = (body: { name: string; amount: number }) =>
  request<Asset>('POST', '/assets', body);
export const putAsset = (id: number, body: { name?: string; amount?: number }) =>
  request<Asset>('PUT', `/assets/${id}`, body);
export const deleteAsset = (id: number) => request<{ ok: boolean }>('DELETE', `/assets/${id}`);

// ---- Expenses ----
export const getExpenses = (monthId: number) => request<Expense[]>('GET', `/expenses/${monthId}`);
export const postExpense = (body: unknown) => request<Expense>('POST', '/expenses', body);
export const putExpense = (id: number, body: unknown) =>
  request<Expense>('PUT', `/expenses/${id}`, body);
export const deleteExpense = (id: number) => request<{ ok: boolean }>('DELETE', `/expenses/${id}`);
export const patchExpenseActive = (id: number, isActive: number) =>
  request<Expense>('PUT', `/expenses/${id}`, { isActive });

// ---- Investments ----
export const getInvestments = (monthId: number) =>
  request<Investment[]>('GET', `/investments/${monthId}`);
export const postInvestment = (body: unknown) => request<Investment>('POST', '/investments', body);
export const deleteInvestment = (id: number) =>
  request<{ ok: boolean }>('DELETE', `/investments/${id}`);

// ---- Incomes ----
export const getIncomes = (monthId: number) => request<Income[]>('GET', `/incomes/${monthId}`);
export const postIncome = (body: {
  monthId: number;
  assetId?: number;
  name: string;
  amount: number;
  date?: string;
}) => request<Income>('POST', '/incomes', body);
export const deleteIncome = (id: number) => request<{ ok: boolean }>('DELETE', `/incomes/${id}`);

// ---- Daily ----
export const getDaily = (monthId: number) => request<DailyExpense[]>('GET', `/daily/${monthId}`);
export const postDaily = (body: unknown) => request<DailyExpense>('POST', '/daily', body);
export const deleteDaily = (id: number) => request<{ ok: boolean }>('DELETE', `/daily/${id}`);

// ---- Projections ----
export const getProjection = (monthId: number) =>
  request<Projection>('GET', `/projections/${monthId}`);
export const postProjection = (body: unknown) => request<unknown>('POST', '/projections', body);
export const putProjection = (id: number, body: unknown) =>
  request<unknown>('PUT', `/projections/${id}`, body);
export const deleteProjection = (id: number) =>
  request<{ ok: boolean }>('DELETE', `/projections/${id}`);
export const resetProjection = (monthId: number) =>
  request<unknown>('POST', `/projections/${monthId}/reset`);

// ---- Me ----
export const getMe = () => request<MeResponse>('GET', '/me');
