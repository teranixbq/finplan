import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  token: text('token').notNull().unique(),
  githubEmail: text('github_email').notNull(),
  githubName: text('github_name').notNull(),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const months = sqliteTable('months', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  salary: real('salary').notNull().default(0),
  salaryDate: integer('salary_date').notNull().default(28),
  createdAt: integer('created_at').notNull(),
});

export const assets = sqliteTable('assets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  amount: real('amount').notNull().default(0),
});

export const investments = sqliteTable('investments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  monthId: integer('month_id')
    .notNull()
    .references(() => months.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type', { enum: ['reksadana', 'saham', 'obligasi'] }).notNull(),
  amount: real('amount').notNull().default(0),
});

export const expenses = sqliteTable('expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  monthId: integer('month_id')
    .notNull()
    .references(() => months.id, { onDelete: 'cascade' }),
  assetId: integer('asset_id'),
  name: text('name').notNull(),
  category: text('category', { enum: ['fixed', 'variable', 'periodic', 'tabungan'] }).notNull(),
  amount: real('amount').notNull().default(0),
  periodMonths: integer('period_months'),
  periodType: text('period_type', { enum: ['month', 'year'] }),
  isActive: integer('is_active').notNull().default(1),
});

export const incomes = sqliteTable('incomes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  monthId: integer('month_id')
    .notNull()
    .references(() => months.id, { onDelete: 'cascade' }),
  assetId: integer('asset_id'),
  name: text('name').notNull(),
  amount: real('amount').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});

export const dailyExpenses = sqliteTable('daily_expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  monthId: integer('month_id')
    .notNull()
    .references(() => months.id, { onDelete: 'cascade' }),
  expenseId: integer('expense_id'),
  date: text('date').notNull(),
  name: text('name').notNull(),
  amount: real('amount').notNull().default(0),
  note: text('note'),
  createdAt: integer('created_at').notNull(),
});

export const assetHistory = sqliteTable('asset_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  assetId: integer('asset_id')
    .notNull()
    .references(() => assets.id, { onDelete: 'cascade' }),
  monthId: integer('month_id'),
  type: text('type').notNull(),
  name: text('name').notNull(),
  amount: real('amount').notNull(),
  balanceAfter: real('balance_after').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const expenseProjections = sqliteTable('expense_projections', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userEmail: text('user_email').notNull(),
  targetMonth: integer('target_month').notNull(),
  targetYear: integer('target_year').notNull(),
  name: text('name').notNull(),
  category: text('category', { enum: ['fixed', 'variable', 'tabungan'] }).notNull(),
  amount: real('amount').notNull().default(0),
  assetId: integer('asset_id'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
