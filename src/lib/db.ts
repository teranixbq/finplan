import { drizzle } from 'drizzle-orm/d1';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

/**
 * Creates a Drizzle DB instance from a D1Database binding.
 * Use this instead of calling drizzle(c.env.DB) directly in every handler.
 */
export function getDb(d1: D1Database): DrizzleD1Database {
  return drizzle(d1);
}

/** Returns current Unix timestamp in seconds. */
export function now(): number {
  return Math.floor(Date.now() / 1000);
}
