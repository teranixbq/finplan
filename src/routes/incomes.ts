import { Hono } from 'hono';
import { eq, desc } from 'drizzle-orm';
import { incomes, assets, assetHistory } from '../db/schema';
import { getDb, now } from '../lib/db';
import { parseId } from '../lib/params';
import type { Env } from '../auth';

const app = new Hono<{ Bindings: Env }>();

// Must be registered BEFORE '/:monthId' to avoid route conflict
app.get('/history/all', async (c) => {
  const db = getDb(c.env.DB);
  return c.json(await db.select().from(assetHistory).orderBy(desc(assetHistory.createdAt)).all());
});

app.get('/:monthId', async (c) => {
  const db = getDb(c.env.DB);
  const monthId = parseId(c.req.param('monthId'));
  if (!monthId) return c.json({ error: 'Invalid monthId' }, 400);
  return c.json(await db.select().from(incomes).where(eq(incomes.monthId, monthId)).all());
});

app.post('/', async (c) => {
  const db = getDb(c.env.DB);
  const body = await c.req.json<{
    monthId: number;
    assetId?: number;
    name: string;
    amount: number;
  }>();
  if (!body.name?.trim() || typeof body.amount !== 'number' || body.amount <= 0) {
    return c.json({ error: 'name and a positive amount are required' }, 400);
  }

  const ts = now();
  const result = await db
    .insert(incomes)
    .values({
      monthId: body.monthId,
      assetId: body.assetId,
      name: body.name.trim(),
      amount: body.amount,
      createdAt: ts,
    })
    .returning()
    .get();

  // Update asset balance and record history if an asset is linked
  if (body.assetId) {
    const asset = await db.select().from(assets).where(eq(assets.id, body.assetId)).get();
    if (asset) {
      const newBalance = asset.amount + body.amount;
      await db.update(assets).set({ amount: newBalance }).where(eq(assets.id, body.assetId));
      await db.insert(assetHistory).values({
        assetId: body.assetId,
        monthId: body.monthId,
        type: 'income',
        name: body.name.trim(),
        amount: body.amount,
        balanceAfter: newBalance,
        createdAt: ts,
      });
    }
  }

  return c.json(result, 201);
});

app.delete('/:id', async (c) => {
  const db = getDb(c.env.DB);
  const id = parseId(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid ID' }, 400);

  const income = await db.select().from(incomes).where(eq(incomes.id, id)).get();
  if (!income) return c.json({ error: 'Not found' }, 404);

  // Reverse asset balance if linked
  if (income.assetId && income.amount > 0) {
    const asset = await db.select().from(assets).where(eq(assets.id, income.assetId)).get();
    if (asset) {
      const newBalance = Math.max(0, asset.amount - income.amount);
      await db.update(assets).set({ amount: newBalance }).where(eq(assets.id, income.assetId));
      await db.insert(assetHistory).values({
        assetId: income.assetId,
        monthId: income.monthId,
        type: 'income_reversal',
        name: income.name,
        amount: -income.amount,
        balanceAfter: newBalance,
        createdAt: now(),
      });
    }
  }

  await db.delete(incomes).where(eq(incomes.id, id));
  return c.json({ ok: true });
});

export default app;
