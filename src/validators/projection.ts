const PROJECTION_CATEGORIES = ['fixed', 'variable', 'tabungan'] as const;
export type ProjectionCategory = (typeof PROJECTION_CATEGORIES)[number];

/** Allowed fields for updating a projection item (explicit whitelist — no mass assignment) */
export interface UpdateProjectionInput {
  name?: string;
  category?: ProjectionCategory;
  amount?: number;
  assetId?: number;
}

/** Extract only whitelisted fields for update to prevent mass assignment */
export function pickUpdateProjection(body: any): UpdateProjectionInput {
  const result: UpdateProjectionInput = {};
  if (typeof body.name === 'string' && body.name.trim().length > 0) result.name = body.name.trim();
  if (PROJECTION_CATEGORIES.includes(body.category)) result.category = body.category;
  if (typeof body.amount === 'number' && body.amount >= 0) result.amount = body.amount;
  if (typeof body.assetId === 'number') result.assetId = body.assetId;
  return result;
}
