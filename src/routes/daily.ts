import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { dailyExpenses } from '../db/schema';
import { getDb, now } from '../lib/db';
import { parseId } from '../lib/params';
import { validateCreateDaily, pickUpdateDaily } from '../validators/daily';
import type { Env } from '../auth';

const app = new Hono<{ Bindings: Env }>();

app.get('/:monthId', async (c) => {
  const db = getDb(c.env.DB);
  const monthId = parseId(c.req.param('monthId'));
  if (!monthId) return c.json({ error: 'Invalid monthId' }, 400);
  return c.json(
    await db.select().from(dailyExpenses).where(eq(dailyExpenses.monthId, monthId)).all(),
  );
});

app.post('/', async (c) => {
  const db = getDb(c.env.DB);
  const body = await c.req.json();
  if (!validateCreateDaily(body)) {
    return c.json(
      { error: 'Invalid input: name, amount, date (YYYY-MM-DD), and monthId are required' },
      400,
    );
  }
  const result = await db
    .insert(dailyExpenses)
    .values({
      monthId: body.monthId,
      expenseId: body.expenseId,
      date: body.date,
      name: body.name.trim(),
      amount: body.amount,
      note: body.note,
      createdAt: now(),
    })
    .returning()
    .get();
  return c.json(result, 201);
});

app.put('/:id', async (c) => {
  const db = getDb(c.env.DB);
  const id = parseId(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid ID' }, 400);

  const existing = await db.select().from(dailyExpenses).where(eq(dailyExpenses.id, id)).get();
  if (!existing) return c.json({ error: 'Not found' }, 404);

  const body = await c.req.json();
  const update = pickUpdateDaily(body);
  if (Object.keys(update).length === 0) return c.json({ error: 'No valid fields to update' }, 400);

  const result = await db
    .update(dailyExpenses)
    .set(update)
    .where(eq(dailyExpenses.id, id))
    .returning()
    .get();
  return c.json(result);
});

app.delete('/:id', async (c) => {
  const db = getDb(c.env.DB);
  const id = parseId(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid ID' }, 400);

  const existing = await db.select().from(dailyExpenses).where(eq(dailyExpenses.id, id)).get();
  if (!existing) return c.json({ error: 'Not found' }, 404);

  await db.delete(dailyExpenses).where(eq(dailyExpenses.id, id));
  return c.json({ ok: true });
});

export default app;
