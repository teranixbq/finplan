import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { expenseProjections, expenses, months } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import type { Env } from '../auth';
import { getSession } from '../auth';

const app = new Hono<{ Bindings: Env }>();

async function getEmail(c: any): Promise<string | null> {
  const cookie = c.req.header('Cookie') || '';
  const session = await getSession(c.env.DB, cookie);
  return session?.githubEmail ?? null;
}

// Compute next month/year from a given month/year
function nextMonth(month: number, year: number) {
  const m = month === 12 ? 1 : month + 1;
  const y = month === 12 ? year + 1 : year;
  return { month: m, year: y };
}

// GET /:monthId — get projection for the month AFTER the given month.
// Auto-seeds from current month's fixed/variable/tabungan expenses if empty.
app.get('/:monthId', async (c) => {
  const db = drizzle(c.env.DB);
  const email = await getEmail(c);
  if (!email) return c.json({ error: 'Unauthorized' }, 401);

  const monthId = parseInt(c.req.param('monthId'));
  const month = await db.select().from(months).where(eq(months.id, monthId)).get();
  if (!month) return c.json({ error: 'Month not found' }, 404);

  const target = nextMonth(month.month, month.year);

  let rows = await db.select().from(expenseProjections).where(and(
    eq(expenseProjections.userEmail, email),
    eq(expenseProjections.targetMonth, target.month),
    eq(expenseProjections.targetYear, target.year),
  )).all();

  let seeded = false;
  if (rows.length === 0) {
    // Auto-seed from current month expenses (fixed, variable, tabungan — skip periodic)
    const src = await db.select().from(expenses).where(eq(expenses.monthId, monthId)).all();
    const seedable = src.filter(e => e.isActive && e.category !== 'periodic');
    const now = Math.floor(Date.now() / 1000);
    for (const e of seedable) {
      await db.insert(expenseProjections).values({
        userEmail: email,
        targetMonth: target.month,
        targetYear: target.year,
        name: e.name,
        category: e.category as 'fixed' | 'variable' | 'tabungan',
        amount: e.amount,
        assetId: e.assetId,
        createdAt: now,
        updatedAt: now,
      });
    }
    rows = await db.select().from(expenseProjections).where(and(
      eq(expenseProjections.userEmail, email),
      eq(expenseProjections.targetMonth, target.month),
      eq(expenseProjections.targetYear, target.year),
    )).all();
    seeded = true;
  }

  return c.json({ target, seeded, items: rows });
});

app.post('/', async (c) => {
  const db = drizzle(c.env.DB);
  const email = await getEmail(c);
  if (!email) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json<{
    targetMonth: number; targetYear: number; name: string;
    category: 'fixed' | 'variable' | 'tabungan'; amount: number; assetId?: number;
  }>();
  const now = Math.floor(Date.now() / 1000);
  const result = await db.insert(expenseProjections).values({
    userEmail: email,
    targetMonth: body.targetMonth,
    targetYear: body.targetYear,
    name: body.name,
    category: body.category,
    amount: body.amount ?? 0,
    assetId: body.assetId,
    createdAt: now,
    updatedAt: now,
  }).returning().get();
  return c.json(result, 201);
});

app.put('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const email = await getEmail(c);
  if (!email) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  delete body.userEmail;
  delete body.targetMonth;
  delete body.targetYear;
  body.updatedAt = Math.floor(Date.now() / 1000);
  const result = await db.update(expenseProjections)
    .set(body)
    .where(and(eq(expenseProjections.id, id), eq(expenseProjections.userEmail, email)))
    .returning().get();
  return c.json(result);
});

app.delete('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const email = await getEmail(c);
  if (!email) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'));
  await db.delete(expenseProjections)
    .where(and(eq(expenseProjections.id, id), eq(expenseProjections.userEmail, email)));
  return c.json({ ok: true });
});

// Reset projection to mirror current month again
app.post('/:monthId/reset', async (c) => {
  const db = drizzle(c.env.DB);
  const email = await getEmail(c);
  if (!email) return c.json({ error: 'Unauthorized' }, 401);

  const monthId = parseInt(c.req.param('monthId'));
  const month = await db.select().from(months).where(eq(months.id, monthId)).get();
  if (!month) return c.json({ error: 'Month not found' }, 404);

  const target = nextMonth(month.month, month.year);

  await db.delete(expenseProjections).where(and(
    eq(expenseProjections.userEmail, email),
    eq(expenseProjections.targetMonth, target.month),
    eq(expenseProjections.targetYear, target.year),
  ));

  const src = await db.select().from(expenses).where(eq(expenses.monthId, monthId)).all();
  const seedable = src.filter(e => e.isActive && e.category !== 'periodic');
  const now = Math.floor(Date.now() / 1000);
  for (const e of seedable) {
    await db.insert(expenseProjections).values({
      userEmail: email,
      targetMonth: target.month,
      targetYear: target.year,
      name: e.name,
      category: e.category as 'fixed' | 'variable' | 'tabungan',
      amount: e.amount,
      assetId: e.assetId,
      createdAt: now,
      updatedAt: now,
    });
  }

  const rows = await db.select().from(expenseProjections).where(and(
    eq(expenseProjections.userEmail, email),
    eq(expenseProjections.targetMonth, target.month),
    eq(expenseProjections.targetYear, target.year),
  )).all();

  return c.json({ target, items: rows });
});

export default app;
