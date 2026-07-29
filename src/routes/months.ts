import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { months, expenses, assets, investments } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import type { Env } from '../auth';

const app = new Hono<{ Bindings: Env }>();

app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const all = await db.select().from(months).all();
  return c.json(all);
});

app.post('/', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json<{ month: number; year: number; salary: number; salaryDate: number }>();
  const now = Math.floor(Date.now() / 1000);

  const existing = await db.select().from(months)
    .where(and(eq(months.month, body.month), eq(months.year, body.year)))
    .get();

  if (existing) return c.json({ error: 'Bulan sudah ada' }, 400);

  const result = await db.insert(months).values({
    month: body.month,
    year: body.year,
    salary: body.salary,
    salaryDate: body.salaryDate ?? 28,
    createdAt: now,
  }).returning().get();

  const prevMonth = body.month === 1 ? 12 : body.month - 1;
  const prevYear = body.month === 1 ? body.year - 1 : body.year;
  const prev = await db.select().from(months)
    .where(and(eq(months.month, prevMonth), eq(months.year, prevYear)))
    .get();

  if (prev) {
    const prevExpenses = await db.select().from(expenses).where(eq(expenses.monthId, prev.id)).all();
    for (const e of prevExpenses) {
      await db.insert(expenses).values({
        monthId: result.id,
        name: e.name,
        category: e.category,
        amount: e.amount,
        isActive: e.isActive,
      });
    }
  }

  return c.json(result, 201);
});

app.put('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json<{ salary?: number; salaryDate?: number }>();
  const result = await db.update(months).set(body).where(eq(months.id, id)).returning().get();
  return c.json(result);
});

app.delete('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const id = parseInt(c.req.param('id'));
  await db.delete(months).where(eq(months.id, id));
  return c.json({ ok: true });
});

app.get('/:id/summary', async (c) => {
  const db = drizzle(c.env.DB);
  const id = parseInt(c.req.param('id'));

  const month = await db.select().from(months).where(eq(months.id, id)).get();
  if (!month) return c.json({ error: 'Not found' }, 404);

  const allAssets = await db.select().from(assets).where(eq(assets.monthId, id)).all();
  const allInvestments = await db.select().from(investments).where(eq(investments.monthId, id)).all();
  const allExpenses = await db.select().from(expenses).where(eq(expenses.monthId, id)).all();

  const totalCash = allAssets.reduce((s, a) => s + a.amount, 0);
  const totalInvestment = allInvestments.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = allExpenses.filter(e => e.isActive && e.category !== 'tabungan').reduce((s, e) => s + e.amount, 0);
  const totalTabungan = allExpenses.filter(e => e.isActive && e.category === 'tabungan').reduce((s, e) => s + e.amount, 0);
  const totalOut = totalExpenses + totalTabungan;

  const availableBeforeSalary = totalCash;
  const sisaSebelumGajian = availableBeforeSalary - totalOut;
  const sisaAkhirBulan = sisaSebelumGajian + month.salary - totalTabungan;

  return c.json({
    month,
    totalCash,
    totalInvestment,
    totalExpenses,
    totalTabungan,
    totalOut,
    sisaSebelumGajian,
    sisaAkhirBulan,
    grandTotal: totalCash + totalInvestment,
  });
});

export default app;
