-- Table for storing next month expense projections
-- Users can plan next month's budget based on current month or customize it
CREATE TABLE IF NOT EXISTS expense_projections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL,
  target_month INTEGER NOT NULL,
  target_year INTEGER NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('fixed','variable','tabungan')),
  amount REAL NOT NULL DEFAULT 0,
  asset_id INTEGER REFERENCES assets(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_email, target_month, target_year, name, category)
);
