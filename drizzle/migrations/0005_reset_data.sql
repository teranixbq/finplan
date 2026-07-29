-- One-time data reset / cleanup.
-- Clears ALL data from every table (including sessions).
-- Schema is unchanged; only rows are removed.
-- Order respects foreign keys (children before parents).

DELETE FROM expense_projections;
DELETE FROM daily_expenses;
DELETE FROM incomes;
DELETE FROM expenses;
DELETE FROM investments;
DELETE FROM assets;
DELETE FROM months;
DELETE FROM sessions;

-- Reset AUTOINCREMENT counters so new rows start from 1
DELETE FROM sqlite_sequence;
