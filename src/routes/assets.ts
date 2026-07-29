import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { assets } from '../db/schema';
import { getDb, now } from '../lib/db';
import { parseId } from '../lib/params';
import type { Env } from '../auth';

const app = new Hono<{ Bindings: Env }>();

app.get('/', async (c) => {
  const db = getDb(c.env.DB);
  return c.json(await db.select().from(assets).all());
});

app.post('/', async (c) => {
  const db = getDb(c.env.DB);
  const body = await c.req.json<{ name: string; amount: number }>();
  if (!body.name?.trim() || typeof body.amount !== 'number') {
    return c.json({ error: 'name and amount are required' }, 400);
  }
  const result = await db
    .insert(assets)
    .values({
      name: body.name.trim(),
      amount: body.amount,
    })
    .returning()
    .get();
  return c.json(result, 201);
});

app.put('/:id', async (c) => {
  const db = getDb(c.env.DB);
  const id = parseId(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid ID' }, 400);

  const existing = await db.select().from(assets).where(eq(assets.id, id)).get();
  if (!existing) return c.json({ error: 'Not found' }, 404);

  const body = await c.req.json<{ name?: string; amount?: number }>();
  const update: { name?: string; amount?: number } = {};
  if (typeof body.name === 'string' && body.name.trim().length > 0) update.name = body.name.trim();
  if (typeof body.amount === 'number' && body.amount >= 0) update.amount = body.amount;

  const result = await db.update(assets).set(update).where(eq(assets.id, id)).returning().get();
  return c.json(result);
});

app.delete('/:id', async (c) => {
  const db = getDb(c.env.DB);
  const id = parseId(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid ID' }, 400);

  const existing = await db.select().from(assets).where(eq(assets.id, id)).get();
  if (!existing) return c.json({ error: 'Not found' }, 404);

  await db.delete(assets).where(eq(assets.id, id));
  return c.json({ ok: true });
});

export default app;
