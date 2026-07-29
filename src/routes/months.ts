import { Hono } from 'hono';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { months, expenses, assets, investments, incomes, dailyExpenses } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import type { Env } from '../auth';
import { getDb, now } from '../lib/db';
import { parseId } from '../lib/params';

const app = new Hono<{ Bindings: Env }>();

app.get('/', async (c) => {
  const db = getDb(c.env.DB);
  const all = await db.select().from(months).all();
  return c.json(all);
});

app.post('/', async (c) => {
  const db = getDb(c.env.DB);
  const body = await c.req.json<{
    month: number;
    year: number;
    salary: number;
    salaryDate: number;
  }>();

  const existing = await db
    .select()
    .from(months)
    .where(and(eq(months.month, body.month), eq(months.year, body.year)))
    .get();
  if (existing) return c.json({ error: 'Bulan sudah ada' }, 400);

  const result = await db
    .insert(months)
    .values({
      month: body.month,
      year: body.year,
      salary: body.salary ?? 0,
      salaryDate: body.salaryDate ?? 28,
      createdAt: now(),
    })
    .returning()
    .get();

  const prevMonth = body.month === 1 ? 12 : body.month - 1;
  const prevYear = body.month === 1 ? body.year - 1 : body.year;
  const prev = await db
    .select()
    .from(months)
    .where(and(eq(months.month, prevMonth), eq(months.year, prevYear)))
    .get();

  if (prev) {
    const prevExpenses = await db
      .select()
      .from(expenses)
      .where(eq(expenses.monthId, prev.id))
      .all();
    for (const e of prevExpenses) {
      await db.insert(expenses).values({
        monthId: result.id,
        assetId: e.assetId,
        name: e.name,
        category: e.category,
        amount: e.amount,
        periodMonths: e.periodMonths,
        periodType: e.periodType,
        isActive: e.isActive,
      });
    }

    const allAssets = await db.select().from(assets).all();
    for (const asset of allAssets) {
      const prevAssetExpenses = prevExpenses.filter((e) => e.assetId === asset.id && e.isActive);
      const prevAssetIncomes = await db
        .select()
        .from(incomes)
        .where(and(eq(incomes.monthId, prev.id), eq(incomes.assetId, asset.id)))
        .all();
      const totalOut = prevAssetExpenses.reduce((s: number, e) => s + e.amount, 0);
      const totalIn = prevAssetIncomes.reduce((s: number, i) => s + i.amount, 0);
      const carryover = asset.amount + totalIn - totalOut;
      if (carryover !== asset.amount) {
        await db
          .update(assets)
          .set({ amount: Math.max(0, carryover) })
          .where(eq(assets.id, asset.id));
      }
    }
  }

  return c.json(result, 201);
});

async function getSummaryData(db: DrizzleD1Database, id: number) {
  const allAssets = await db.select().from(assets).all();
  const allInvestments = await db
    .select()
    .from(investments)
    .where(eq(investments.monthId, id))
    .all();
  const allExpenses = await db.select().from(expenses).where(eq(expenses.monthId, id)).all();
  const allIncomes = await db.select().from(incomes).where(eq(incomes.monthId, id)).all();
  const allDaily = await db.select().from(dailyExpenses).where(eq(dailyExpenses.monthId, id)).all();
  return { allAssets, allInvestments, allExpenses, allIncomes, allDaily };
}

app.put('/:id', async (c) => {
  const db = getDb(c.env.DB);
  const id = parseId(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid ID' }, 400);

  const existing = await db.select().from(months).where(eq(months.id, id)).get();
  if (!existing) return c.json({ error: 'Not found' }, 404);

  const body = await c.req.json<{ salary?: number; salaryDate?: number }>();
  const update: { salary?: number; salaryDate?: number } = {};
  if (typeof body.salary === 'number' && body.salary >= 0) update.salary = body.salary;
  if (typeof body.salaryDate === 'number' && body.salaryDate >= 1 && body.salaryDate <= 31)
    update.salaryDate = body.salaryDate;

  if (Object.keys(update).length === 0) return c.json({ error: 'No valid fields to update' }, 400);

  const result = await db.update(months).set(update).where(eq(months.id, id)).returning().get();
  return c.json(result);
});

app.delete('/:id', async (c) => {
  const db = getDb(c.env.DB);
  const id = parseId(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid ID' }, 400);

  const existing = await db.select().from(months).where(eq(months.id, id)).get();
  if (!existing) return c.json({ error: 'Not found' }, 404);

  await db.delete(months).where(eq(months.id, id));
  return c.json({ ok: true });
});

app.get('/:id/summary', async (c) => {
  const db = getDb(c.env.DB);
  const id = parseId(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid ID' }, 400);

  const month = await db.select().from(months).where(eq(months.id, id)).get();
  if (!month) return c.json({ error: 'Not found' }, 404);

  const { allAssets, allInvestments, allExpenses, allIncomes, allDaily } = await getSummaryData(
    db,
    id,
  );

  const totalCash = allAssets.reduce((s: number, a) => s + a.amount, 0);
  const totalInvestment = allInvestments.reduce((s: number, i) => s + i.amount, 0);
  const totalFixed = allExpenses
    .filter((e) => e.isActive && e.category === 'fixed')
    .reduce((s: number, e) => s + e.amount, 0);
  const totalVariable = allExpenses
    .filter((e) => e.isActive && e.category === 'variable')
    .reduce((s: number, e) => s + e.amount, 0);
  const totalPeriodic = allExpenses
    .filter((e) => e.isActive && e.category === 'periodic')
    .reduce((s: number, e) => s + e.amount, 0);
  const totalTabungan = allExpenses
    .filter((e) => e.isActive && e.category === 'tabungan')
    .reduce((s: number, e) => s + e.amount, 0);
  const totalDaily = allDaily.reduce((s: number, d) => s + d.amount, 0);
  const totalIncomes = allIncomes.reduce((s: number, i) => s + i.amount, 0);
  const totalBudget = totalFixed + totalVariable + totalPeriodic + totalTabungan;
  const totalExpenses = totalBudget; // alias, kept for compatibility
  const totalOut = totalBudget + totalDaily; // budget + aktual harian

  // sisaSebelumGajian = (Dana Cair + Investasi) - Pengeluaran Aktual (daily)
  // budget (totalExpenses) hanya untuk BVA comparison, bukan pengeluaran nyata
  const sisaSebelumGajian = totalCash + totalInvestment - totalDaily;
  const sisaAkhirBulan = sisaSebelumGajian + month.salary;

  const dailyByDate: Record<string, number> = {};
  for (const d of allDaily) {
    dailyByDate[d.date] = (dailyByDate[d.date] || 0) + d.amount;
  }
  const avgDaily = allDaily.length > 0 ? totalDaily / Object.keys(dailyByDate).length : 0;
  const busiestDay = Object.entries(dailyByDate).sort((a, b) => b[1] - a[1])[0];

  return c.json({
    month,
    totalCash,
    totalInvestment,
    totalFixed,
    totalVariable,
    totalPeriodic,
    totalTabungan,
    totalDaily,
    totalIncomes,
    totalBudget,
    totalExpenses,
    totalOut,
    sisaSebelumGajian,
    sisaAkhirBulan,
    grandTotal: totalCash + totalInvestment,
    avgDailyExpense: Math.round(avgDaily),
    busiestDay: busiestDay ? { date: busiestDay[0], amount: busiestDay[1] } : null,
    assets: allAssets,
  });
});

export default app;
