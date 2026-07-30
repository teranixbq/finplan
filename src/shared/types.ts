// ============================================================
// src/shared/types.ts — shared API contract types
// Used by both backend (return c.json) and frontend (typed fetch)
// ============================================================

export interface Month {
  id: number;
  month: number;
  year: number;
  salary: number;
  salaryDate: number;
  createdAt: number;
}

export interface Asset {
  id: number;
  name: string;
  amount: number;
}

export interface Expense {
  id: number;
  monthId: number;
  assetId: number | null;
  name: string;
  category: 'fixed' | 'variable' | 'periodic' | 'tabungan';
  amount: number;
  periodMonths: number | null;
  periodType: string | null;
  isActive: number; // 0 or 1
}

export interface Investment {
  id: number;
  monthId: number;
  name: string;
  type: string;
  amount: number;
  createdAt: number;
}

export interface Income {
  id: number;
  monthId: number;
  assetId: number | null;
  name: string;
  amount: number;
  date: string | null;
  createdAt: number;
}

export interface DailyExpense {
  id: number;
  monthId: number;
  expenseId: number | null;
  date: string; // YYYY-MM-DD
  name: string;
  amount: number;
  note: string | null;
}

export interface ProjectionItem {
  id: number;
  monthId: number;
  targetMonth: number;
  targetYear: number;
  assetId: number | null;
  name: string;
  category: 'fixed' | 'variable' | 'periodic' | 'tabungan';
  amount: number;
}

export interface Projection {
  target: { month: number; year: number } | null;
  items: ProjectionItem[];
}

export interface BusiestDay {
  date: string;
  amount: number;
}

export interface SummaryResponse {
  month: Month;
  totalCash: number;
  totalInvestment: number;
  totalFixed: number;
  totalVariable: number;
  totalPeriodic: number;
  totalTabungan: number;
  totalDaily: number;
  totalIncomes: number;
  totalBudget: number;
  totalExpenses: number;
  totalOut: number;
  sisaSebelumGajian: number;
  sisaAkhirBulan: number;
  grandTotal: number;
  avgDailyExpense: number;
  busiestDay: BusiestDay | null;
  assets: Asset[];
}

export interface MeResponse {
  name: string;
  email: string;
}
