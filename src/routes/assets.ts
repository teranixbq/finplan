import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { assets } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { Env } from '../auth';

const app = new Hono<{ Bindings: Env }>();

app.get('/:monthId', async (c) => {
  const db = drizzle(c.env.DB);
  const monthId = parseInt(c.req.param('monthId'));
  const result = await db.select().from(assets).where(eq(assets.monthId, monthId)).all();
  return c.json(result);
});

app.post('/', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json<{ monthId: number; name: string; amount: number }>();
  const result = await db.insert(assets).values(body).returning().get();
  return c.json(result, 201);
});

app.put('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json<{ name?: string; amount?: number }>();
  const result = await db.update(assets).set(body).where(eq(assets.id, id)).returning().get();
  return c.json(result);
});

app.delete('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const id = parseInt(c.req.param('id'));
  await db.delete(assets).where(eq(assets.id, id));
  return c.json({ ok: true });
});

export default app;
