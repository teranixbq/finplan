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
  monthId: integer('month_id').notNull().references(() => months.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  amount: real('amount').notNull().default(0),
});

export const investments = sqliteTable('investments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  monthId: integer('month_id').notNull().references(() => months.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type', { enum: ['reksadana', 'saham', 'obligasi'] }).notNull(),
  amount: real('amount').notNull().default(0),
});

export const expenses = sqliteTable('expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  monthId: integer('month_id').notNull().references(() => months.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  category: text('category', { enum: ['fixed', 'variable', 'periodic', 'tabungan'] }).notNull(),
  amount: real('amount').notNull().default(0),
  isActive: integer('is_active').notNull().default(1),
});
