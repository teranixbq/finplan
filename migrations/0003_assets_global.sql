-- Make assets global (remove month_id). Assets are configured once and carry over.
-- Table is safe to recreate here (cleaned). Rebuild without month_id.

CREATE TABLE assets_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0
);

INSERT INTO assets_new (id, name, amount)
  SELECT id, name, amount FROM assets;

DROP TABLE assets;

ALTER TABLE assets_new RENAME TO assets;
