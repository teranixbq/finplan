import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { investments } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { Env } from '../auth';

const app = new Hono<{ Bindings: Env }>();

app.get('/:monthId', async (c) => {
  const db = drizzle(c.env.DB);
  const monthId = parseInt(c.req.param('monthId'));
  const result = await db.select().from(investments).where(eq(investments.monthId, monthId)).all();
  return c.json(result);
});

app.post('/', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json<{ monthId: number; name: string; type: 'reksadana' | 'saham' | 'obligasi'; amount: number }>();
  const result = await db.insert(investments).values(body).returning().get();
  return c.json(result, 201);
});

app.put('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json<{ name?: string; type?: 'reksadana' | 'saham' | 'obligasi'; amount?: number }>();
  const result = await db.update(investments).set(body).where(eq(investments.id, id)).returning().get();
  return c.json(result);
});

app.delete('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const id = parseInt(c.req.param('id'));
  await db.delete(investments).where(eq(investments.id, id));
  return c.json({ ok: true });
});

export default app;
