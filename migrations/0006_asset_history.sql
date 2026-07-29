-- Track history of cash asset (dana cair) balance changes.
-- Currently records additions from "Pemasukan Tambahan".
CREATE TABLE IF NOT EXISTS asset_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  month_id INTEGER REFERENCES months(id) ON DELETE SET NULL,
  type TEXT NOT NULL,            -- e.g. 'income'
  name TEXT NOT NULL,           -- description (income name)
  amount REAL NOT NULL,         -- delta applied (positive = added)
  balance_after REAL NOT NULL,  -- asset balance after this change
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_asset_history_asset ON asset_history(asset_id);
