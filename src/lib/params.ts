/**
 * Parses a route param string to a positive integer.
 * Returns null if the value is not a valid positive integer.
 *
 * Usage:
 *   const id = parseId(c.req.param('id'));
 *   if (!id) return c.json({ error: 'Invalid ID' }, 400);
 */
export function parseId(value: string): number | null {
  const n = parseInt(value, 10);
  if (isNaN(n) || n <= 0) return null;
  return n;
}
