import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { investments } from '../db/schema';
import { getDb } from '../lib/db';
import { parseId } from '../lib/params';
import { validateCreateInvestment, pickUpdateInvestment } from '../validators/investment';
import type { Env } from '../auth';

const app = new Hono<{ Bindings: Env }>();

app.get('/:monthId', async (c) => {
  const db = getDb(c.env.DB);
  const monthId = parseId(c.req.param('monthId'));
  if (!monthId) return c.json({ error: 'Invalid monthId' }, 400);
  return c.json(await db.select().from(investments).where(eq(investments.monthId, monthId)).all());
});

app.post('/', async (c) => {
  const db = getDb(c.env.DB);
  const body = await c.req.json();
  if (!validateCreateInvestment(body)) {
    return c.json({ error: 'Invalid input: name, type, amount, and monthId are required' }, 400);
  }
  const result = await db
    .insert(investments)
    .values({
      monthId: body.monthId,
      name: body.name.trim(),
      type: body.type,
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

  const existing = await db.select().from(investments).where(eq(investments.id, id)).get();
  if (!existing) return c.json({ error: 'Not found' }, 404);

  const body = await c.req.json();
  const update = pickUpdateInvestment(body);
  if (Object.keys(update).length === 0) return c.json({ error: 'No valid fields to update' }, 400);

  const result = await db
    .update(investments)
    .set(update)
    .where(eq(investments.id, id))
    .returning()
    .get();
  return c.json(result);
});

app.delete('/:id', async (c) => {
  const db = getDb(c.env.DB);
  const id = parseId(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid ID' }, 400);

  const existing = await db.select().from(investments).where(eq(investments.id, id)).get();
  if (!existing) return c.json({ error: 'Not found' }, 404);

  await db.delete(investments).where(eq(investments.id, id));
  return c.json({ ok: true });
});

export default app;
