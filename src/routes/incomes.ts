import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { incomes, assets } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { Env } from '../auth';

const app = new Hono<{ Bindings: Env }>();

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
      await db.update(assets).set({ amount: asset.amount + body.amount }).where(eq(assets.id, body.assetId));
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
      await db.update(assets).set({ amount: Math.max(0, asset.amount - income.amount) }).where(eq(assets.id, income.assetId));
    }
  }
  await db.delete(incomes).where(eq(incomes.id, id));
  return c.json({ ok: true });
});

export default app;
