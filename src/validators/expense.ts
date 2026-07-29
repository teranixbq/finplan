import type { Context } from 'hono';
import type { Env } from '../auth';

/** Allowed fields for creating an expense */
export interface CreateExpenseInput {
  monthId: number;
  assetId?: number;
  name: string;
  category: 'fixed' | 'variable' | 'periodic' | 'tabungan';
  amount: number;
  periodMonths?: number;
  periodType?: 'month' | 'year';
  isActive?: number;
}

/** Allowed fields for updating an expense (explicit whitelist — no mass assignment) */
export interface UpdateExpenseInput {
  name?: string;
  category?: 'fixed' | 'variable' | 'periodic' | 'tabungan';
  amount?: number;
  assetId?: number;
  periodMonths?: number;
  periodType?: 'month' | 'year';
  isActive?: number;
}

export function validateCreateExpense(body: any): body is CreateExpenseInput {
  return (
    typeof body.monthId === 'number' &&
    typeof body.name === 'string' &&
    body.name.trim().length > 0 &&
    ['fixed', 'variable', 'periodic', 'tabungan'].includes(body.category) &&
    typeof body.amount === 'number' &&
    body.amount >= 0
  );
}

/** Extract only whitelisted fields for update to prevent mass assignment */
export function pickUpdateExpense(body: any): UpdateExpenseInput {
  const result: UpdateExpenseInput = {};
  if (typeof body.name === 'string' && body.name.trim().length > 0) result.name = body.name.trim();
  if (['fixed', 'variable', 'periodic', 'tabungan'].includes(body.category))
    result.category = body.category;
  if (typeof body.amount === 'number' && body.amount >= 0) result.amount = body.amount;
  if (typeof body.assetId === 'number') result.assetId = body.assetId;
  if (typeof body.periodMonths === 'number') result.periodMonths = body.periodMonths;
  if (['month', 'year'].includes(body.periodType)) result.periodType = body.periodType;
  if (body.isActive === 0 || body.isActive === 1) result.isActive = body.isActive;
  return result;
}
