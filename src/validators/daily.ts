/** Allowed fields for creating a daily expense entry */
export interface CreateDailyInput {
  monthId: number;
  expenseId?: number;
  date: string;
  name: string;
  amount: number;
  note?: string;
}

/** Allowed fields for updating a daily expense (explicit whitelist — no mass assignment) */
export interface UpdateDailyInput {
  name?: string;
  amount?: number;
  date?: string;
  note?: string;
  expenseId?: number;
}

export function validateCreateDaily(body: any): body is CreateDailyInput {
  return (
    typeof body.monthId === 'number' &&
    typeof body.name === 'string' &&
    body.name.trim().length > 0 &&
    typeof body.amount === 'number' &&
    body.amount >= 0 &&
    typeof body.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(body.date)
  );
}

/** Extract only whitelisted fields for update to prevent mass assignment */
export function pickUpdateDaily(body: any): UpdateDailyInput {
  const result: UpdateDailyInput = {};
  if (typeof body.name === 'string' && body.name.trim().length > 0) result.name = body.name.trim();
  if (typeof body.amount === 'number' && body.amount >= 0) result.amount = body.amount;
  if (typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date))
    result.date = body.date;
  if (typeof body.note === 'string') result.note = body.note;
  if (typeof body.expenseId === 'number') result.expenseId = body.expenseId;
  return result;
}
