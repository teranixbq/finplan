const INVESTMENT_TYPES = ['reksadana', 'saham', 'obligasi'] as const;
export type InvestmentType = (typeof INVESTMENT_TYPES)[number];

/** Allowed fields for creating an investment */
export interface CreateInvestmentInput {
  monthId: number;
  name: string;
  type: InvestmentType;
  amount: number;
}

/** Allowed fields for updating an investment (explicit whitelist — no mass assignment) */
export interface UpdateInvestmentInput {
  name?: string;
  type?: InvestmentType;
  amount?: number;
}

export function validateCreateInvestment(body: any): body is CreateInvestmentInput {
  return (
    typeof body.monthId === 'number' &&
    typeof body.name === 'string' &&
    body.name.trim().length > 0 &&
    INVESTMENT_TYPES.includes(body.type) &&
    typeof body.amount === 'number' &&
    body.amount >= 0
  );
}

/** Extract only whitelisted fields for update to prevent mass assignment */
export function pickUpdateInvestment(body: any): UpdateInvestmentInput {
  const result: UpdateInvestmentInput = {};
  if (typeof body.name === 'string' && body.name.trim().length > 0) result.name = body.name.trim();
  if (INVESTMENT_TYPES.includes(body.type)) result.type = body.type;
  if (typeof body.amount === 'number' && body.amount >= 0) result.amount = body.amount;
  return result;
}
