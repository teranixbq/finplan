import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { dailyExpenses } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { Env } from '../auth';

const app = new Hono<{ Bindings: Env }>();

app.get('/:monthId', async (c) => {
  const db = drizzle(c.env.DB);
  const monthId = parseInt(c.req.param('monthId'));
  const result = await db.select().from(dailyExpenses).where(eq(dailyExpenses.monthId, monthId)).all();
  return c.json(result);
});

app.post('/', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json<{
    monthId: number; expenseId?: number; date: string;
    name: string; amount: number; note?: string;
  }>();
  const now = Math.floor(Date.now() / 1000);
  const result = await db.insert(dailyExpenses).values({ ...body, createdAt: now }).returning().get();
  return c.json(result, 201);
});

app.put('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const result = await db.update(dailyExpenses).set(body).where(eq(dailyExpenses.id, id)).returning().get();
  return c.json(result);
});

app.delete('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const id = parseInt(c.req.param('id'));
  await db.delete(dailyExpenses).where(eq(dailyExpenses.id, id));
  return c.json({ ok: true });
});

export default app;
