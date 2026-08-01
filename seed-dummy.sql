-- ============================================================
-- CLEANSING: Hapus semua data transaksi (keep sessions)
-- ============================================================
DELETE FROM asset_history;
DELETE FROM daily_expenses;
DELETE FROM expense_projections;
DELETE FROM incomes;
DELETE FROM investments;
DELETE FROM expenses;
DELETE FROM months;
DELETE FROM assets;

-- ============================================================
-- SEED: Assets (Dana Cair)
-- ============================================================
INSERT INTO assets (id, name, amount) VALUES
(1, 'BCA', 5000000),
(2, 'Gopay', 500000);

-- ============================================================
-- SEED: Months (Juli 2026 & Agustus 2026)
-- ============================================================
INSERT INTO months (id, month, year, salary, salary_date, created_at) VALUES
(1, 7, 2026, 6500000, 25, 1719792000),
(2, 8, 2026, 6500000, 25, 1722470400);

-- ============================================================
-- SEED: Investments (Rp2.000.000 per bulan)
-- ============================================================
INSERT INTO investments (month_id, name, type, amount) VALUES
(1, 'Saham BRI', 'saham', 1000000),
(1, 'Reksadana Mandiri', 'reksadana', 1000000),
(2, 'Saham BRI', 'saham', 1000000),
(2, 'Reksadana Mandiri', 'reksadana', 1000000);

-- ============================================================
-- SEED: Expenses (Juli 2026) - Budget awal
-- ============================================================
INSERT INTO expenses (month_id, asset_id, name, category, amount, is_active) VALUES
(1, 1, 'Kosan', 'fixed', 1500000, 1),
(1, 1, 'Internet', 'fixed', 300000, 1),
(1, 2, 'Token Listrik', 'fixed', 150000, 1),
(1, 2, 'Makan', 'variable', 1000000, 1),
(1, 2, 'Transport', 'variable', 250000, 1),
(1, 2, 'Belanja', 'variable', 150000, 1),
(1, 1, 'Tabungan Darurat', 'tabungan', 400000, 1),
(1, 1, 'Tabungan Liburan', 'tabungan', 250000, 1);

INSERT INTO expenses (month_id, asset_id, name, category, amount, period_months, period_type, is_active) VALUES
(1, 1, 'Langganan Spotify', 'periodic', 50000, 1, 'month', 1),
(1, 1, 'Langganan Netflix', 'periodic', 100000, 1, 'month', 1);

-- ============================================================
-- SEED: Expenses (Agustus 2026) - Disesuaikan dari Juli
-- ============================================================
INSERT INTO expenses (month_id, asset_id, name, category, amount, is_active) VALUES
(2, 1, 'Kosan', 'fixed', 1500000, 1),
(2, 1, 'Internet', 'fixed', 300000, 1),
(2, 2, 'Token Listrik', 'fixed', 200000, 1),
(2, 2, 'Makan', 'variable', 1200000, 1),
(2, 2, 'Transport', 'variable', 300000, 1),
(2, 2, 'Belanja', 'variable', 200000, 1),
(2, 1, 'Tabungan Darurat', 'tabungan', 500000, 1),
(2, 1, 'Tabungan Liburan', 'tabungan', 300000, 1);

INSERT INTO expenses (month_id, asset_id, name, category, amount, period_months, period_type, is_active) VALUES
(2, 1, 'Langganan Spotify', 'periodic', 50000, 1, 'month', 1),
(2, 1, 'Langganan Netflix', 'periodic', 100000, 1, 'month', 1);

-- ============================================================
-- SEED: Incomes (Gaji + Bonus)
-- ============================================================
INSERT INTO incomes (month_id, asset_id, name, amount, created_at) VALUES
(1, 1, 'Gaji Pokok', 6000000, 1721865600),
(1, 1, 'Bonus Project', 500000, 1721865600),
(2, 1, 'Gaji Pokok', 6000000, 1724544000),
(2, 1, 'Bonus Project', 500000, 1724544000);

-- ============================================================
-- SEED: Daily Expenses (Kosong - biar bisa demo input manual)
-- ============================================================
-- (Tidak ada data daily expenses di seed)

-- ============================================================
-- SEED: Asset History
-- ============================================================
INSERT INTO asset_history (asset_id, month_id, type, name, amount, balance_after, created_at) VALUES
(1, 1, 'income', 'Gaji Pokok', 6000000, 11000000, 1721865600),
(1, 1, 'income', 'Bonus Project', 500000, 11500000, 1721865600),
(1, 2, 'income', 'Gaji Pokok', 6000000, 17500000, 1724544000),
(1, 2, 'income', 'Bonus Project', 500000, 18000000, 1724544000);

-- ============================================================
-- SEED: Expense Projections (September 2026)
-- ============================================================
INSERT INTO expense_projections (user_email, target_month, target_year, name, category, amount, asset_id, created_at, updated_at) VALUES
('hanieffathulb03@gmail.com', 9, 2026, 'Kosan', 'fixed', 1500000, 1, 1722470400, 1722470400),
('hanieffathulb03@gmail.com', 9, 2026, 'Internet', 'fixed', 300000, 1, 1722470400, 1722470400),
('hanieffathulb03@gmail.com', 9, 2026, 'Token Listrik', 'fixed', 200000, 2, 1722470400, 1722470400),
('hanieffathulb03@gmail.com', 9, 2026, 'Makan', 'variable', 1200000, 2, 1722470400, 1722470400),
('hanieffathulb03@gmail.com', 9, 2026, 'Transport', 'variable', 300000, 2, 1722470400, 1722470400),
('hanieffathulb03@gmail.com', 9, 2026, 'Belanja', 'variable', 200000, 2, 1722470400, 1722470400),
('hanieffathulb03@gmail.com', 9, 2026, 'Tabungan Darurat', 'tabungan', 500000, 1, 1722470400, 1722470400),
('hanieffathulb03@gmail.com', 9, 2026, 'Tabungan Liburan', 'tabungan', 300000, 1, 1722470400, 1722470400);
