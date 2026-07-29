import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { incomes, assets, assetHistory } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import type { Env } from '../auth';

const app = new Hono<{ Bindings: Env }>();

// history for all assets — must be registered BEFORE '/:monthId'
app.get('/history/all', async (c) => {
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(assetHistory).orderBy(desc(assetHistory.createdAt)).all();
  return c.json(rows);
});

app.get('/:monthId', async (c) => {
  const db = drizzle(c.env.DB);
  const monthId = parseInt(c.req.param('monthId'));
  const result = await db.select().from(incomes).where(eq(incomes.monthId, monthId)).all();
  return c.json(result);
});

app.post('/', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json<{ monthId: number; assetId?: number; name: string; amount: number }>();
  const now = Math.floor(Date.now() / 1000);
  const result = await db.insert(incomes).values({ ...body, createdAt: now }).returning().get();

  if (body.assetId && body.amount > 0) {
    const asset = await db.select().from(assets).where(eq(assets.id, body.assetId)).get();
    if (asset) {
      const newBalance = asset.amount + body.amount;
      await db.update(assets).set({ amount: newBalance }).where(eq(assets.id, body.assetId));
      // record history entry
      await db.insert(assetHistory).values({
        assetId: body.assetId,
        monthId: body.monthId,
        type: 'income',
        name: body.name,
        amount: body.amount,
        balanceAfter: newBalance,
        createdAt: now,
      });
    }
  }
  return c.json(result, 201);
});

app.delete('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const id = parseInt(c.req.param('id'));
  const income = await db.select().from(incomes).where(eq(incomes.id, id)).get();
  if (income && income.assetId && income.amount > 0) {
    const asset = await db.select().from(assets).where(eq(assets.id, income.assetId)).get();
    if (asset) {
      const newBalance = Math.max(0, asset.amount - income.amount);
      await db.update(assets).set({ amount: newBalance }).where(eq(assets.id, income.assetId));
      // record reversal in history
      const now = Math.floor(Date.now() / 1000);
      await db.insert(assetHistory).values({
        assetId: income.assetId,
        monthId: income.monthId,
        type: 'income_reversal',
        name: income.name,
        amount: -income.amount,
        balanceAfter: newBalance,
        createdAt: now,
      });
    }
  }
  await db.delete(incomes).where(eq(incomes.id, id));
  return c.json({ ok: true });
});

export default app;
