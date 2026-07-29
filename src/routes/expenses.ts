import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { expenses } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { Env } from '../auth';

const app = new Hono<{ Bindings: Env }>();

app.get('/:monthId', async (c) => {
  const db = drizzle(c.env.DB);
  const monthId = parseInt(c.req.param('monthId'));
  const result = await db.select().from(expenses).where(eq(expenses.monthId, monthId)).all();
  return c.json(result);
});

app.post('/', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json<{ monthId: number; name: string; category: 'fixed' | 'variable' | 'periodic' | 'tabungan'; amount: number; isActive?: number }>();
  const result = await db.insert(expenses).values({ ...body, isActive: body.isActive ?? 1 }).returning().get();
  return c.json(result, 201);
});

app.put('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json<{ name?: string; category?: 'fixed' | 'variable' | 'periodic' | 'tabungan'; amount?: number; isActive?: number }>();
  const result = await db.update(expenses).set(body).where(eq(expenses.id, id)).returning().get();
  return c.json(result);
});

app.delete('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const id = parseInt(c.req.param('id'));
  await db.delete(expenses).where(eq(expenses.id, id));
  return c.json({ ok: true });
});

export default app;
