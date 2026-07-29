import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { expenseProjections, expenses, months } from '../db/schema';
import { getDb, now } from '../lib/db';
import { parseId } from '../lib/params';
import { pickUpdateProjection } from '../validators/projection';
import type { Env } from '../auth';
import { getSession } from '../auth';
import type { Context } from 'hono';

const app = new Hono<{ Bindings: Env }>();

// ---- HELPERS -----------------------------------------------

/** Resolve the session email from the request cookie. */
async function getEmail(c: Context<{ Bindings: Env }>): Promise<string | null> {
  const cookie = c.req.header('Cookie') || '';
  const session = await getSession(c.env.DB, cookie);
  return session?.githubEmail ?? null;
}

/** Returns the next calendar month/year. */
function nextMonth(month: number, year: number): { month: number; year: number } {
  return month === 12 ? { month: 1, year: year + 1 } : { month: month + 1, year };
}

/** Fetch all projection rows for a given email + target month/year. */
async function fetchProjections(
  db: ReturnType<typeof getDb>,
  email: string,
  target: { month: number; year: number },
) {
  return db
    .select()
    .from(expenseProjections)
    .where(
      and(
        eq(expenseProjections.userEmail, email),
        eq(expenseProjections.targetMonth, target.month),
        eq(expenseProjections.targetYear, target.year),
      ),
    )
    .all();
}

/**
 * Seed projection rows from the given month's active expenses
 * (excludes periodic category). Existing rows must be cleared first.
 */
async function seedProjections(
  db: ReturnType<typeof getDb>,
  email: string,
  monthId: number,
  target: { month: number; year: number },
) {
  const src = await db.select().from(expenses).where(eq(expenses.monthId, monthId)).all();
  const seedable = src.filter((e) => e.isActive && e.category !== 'periodic');
  const ts = now();
  for (const e of seedable) {
    await db.insert(expenseProjections).values({
      userEmail: email,
      targetMonth: target.month,
      targetYear: target.year,
      name: e.name,
      category: e.category as 'fixed' | 'variable' | 'tabungan',
      amount: e.amount,
      assetId: e.assetId,
      createdAt: ts,
      updatedAt: ts,
    });
  }
}

// ---- ROUTES ------------------------------------------------

// GET /:monthId — get projection for the month AFTER the given month.
// Auto-seeds from current month's active non-periodic expenses if empty.
app.get('/:monthId', async (c) => {
  const db = getDb(c.env.DB);
  const email = await getEmail(c);
  if (!email) return c.json({ error: 'Unauthorized' }, 401);

  const monthId = parseId(c.req.param('monthId'));
  if (!monthId) return c.json({ error: 'Invalid monthId' }, 400);

  const month = await db.select().from(months).where(eq(months.id, monthId)).get();
  if (!month) return c.json({ error: 'Month not found' }, 404);

  const target = nextMonth(month.month, month.year);
  let rows = await fetchProjections(db, email, target);

  let seeded = false;
  if (rows.length === 0) {
    await seedProjections(db, email, monthId, target);
    rows = await fetchProjections(db, email, target);
    seeded = true;
  }

  return c.json({ target, seeded, items: rows });
});

app.post('/', async (c) => {
  const db = getDb(c.env.DB);
  const email = await getEmail(c);
  if (!email) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json<{
    targetMonth: number;
    targetYear: number;
    name: string;
    category: 'fixed' | 'variable' | 'tabungan';
    amount: number;
    assetId?: number;
  }>();

  if (!body.name?.trim() || !body.targetMonth || !body.targetYear) {
    return c.json({ error: 'name, targetMonth, and targetYear are required' }, 400);
  }

  const ts = now();
  const result = await db
    .insert(expenseProjections)
    .values({
      userEmail: email,
      targetMonth: body.targetMonth,
      targetYear: body.targetYear,
      name: body.name.trim(),
      category: body.category,
      amount: body.amount ?? 0,
      assetId: body.assetId,
      createdAt: ts,
      updatedAt: ts,
    })
    .returning()
    .get();

  return c.json(result, 201);
});

app.put('/:id', async (c) => {
  const db = getDb(c.env.DB);
  const email = await getEmail(c);
  if (!email) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseId(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid ID' }, 400);

  const existing = await db
    .select()
    .from(expenseProjections)
    .where(and(eq(expenseProjections.id, id), eq(expenseProjections.userEmail, email)))
    .get();
  if (!existing) return c.json({ error: 'Not found' }, 404);

  const body = await c.req.json();
  const update = pickUpdateProjection(body);
  if (Object.keys(update).length === 0) return c.json({ error: 'No valid fields to update' }, 400);

  const result = await db
    .update(expenseProjections)
    .set({ ...update, updatedAt: now() })
    .where(and(eq(expenseProjections.id, id), eq(expenseProjections.userEmail, email)))
    .returning()
    .get();

  return c.json(result);
});

app.delete('/:id', async (c) => {
  const db = getDb(c.env.DB);
  const email = await getEmail(c);
  if (!email) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseId(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid ID' }, 400);

  const existing = await db
    .select()
    .from(expenseProjections)
    .where(and(eq(expenseProjections.id, id), eq(expenseProjections.userEmail, email)))
    .get();
  if (!existing) return c.json({ error: 'Not found' }, 404);

  await db
    .delete(expenseProjections)
    .where(and(eq(expenseProjections.id, id), eq(expenseProjections.userEmail, email)));

  return c.json({ ok: true });
});

// Reset projection to mirror current month's active expenses again
app.post('/:monthId/reset', async (c) => {
  const db = getDb(c.env.DB);
  const email = await getEmail(c);
  if (!email) return c.json({ error: 'Unauthorized' }, 401);

  const monthId = parseId(c.req.param('monthId'));
  if (!monthId) return c.json({ error: 'Invalid monthId' }, 400);

  const month = await db.select().from(months).where(eq(months.id, monthId)).get();
  if (!month) return c.json({ error: 'Month not found' }, 404);

  const target = nextMonth(month.month, month.year);

  // Clear existing projections then re-seed from current month
  await db
    .delete(expenseProjections)
    .where(
      and(
        eq(expenseProjections.userEmail, email),
        eq(expenseProjections.targetMonth, target.month),
        eq(expenseProjections.targetYear, target.year),
      ),
    );

  await seedProjections(db, email, monthId, target);
  const rows = await fetchProjections(db, email, target);

  return c.json({ target, items: rows });
});

export default app;
