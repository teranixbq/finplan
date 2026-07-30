-- Migration 0007: add date column to incomes table
ALTER TABLE incomes ADD COLUMN date text;
