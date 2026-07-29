# Database Schema — FinPlan

Database: Cloudflare D1 (SQLite)
ORM: Drizzle ORM
Schema file: `src/db/schema.ts`

---

## Tables

### `sessions`
Stores login sessions via GitHub OAuth.

| Column | Type | Description |
|--------|------|-------------|
| id | integer PK | Auto increment |
| token | text UNIQUE | Session token (random 32 bytes hex) |
| github_email | text | User GitHub email |
| github_name | text | User GitHub name |
| expires_at | integer | Session expiry Unix timestamp |
| created_at | integer | Created Unix timestamp |

---

### `months`
One row = one financial period month.

| Column | Type | Description |
|--------|------|-------------|
| id | integer PK | Auto increment |
| month | integer | Month (1-12) |
| year | integer | Year (e.g. 2025) |
| salary | real | Monthly salary |
| salary_date | integer | Payday date (default 28) |
| created_at | integer | Created Unix timestamp |

**Constraint:** month + year combination must be unique (checked manually in route, not DB constraint).

---

### `assets`
Liquid funds — bank accounts, e-wallets, cash. **Global (not per month).**

| Column | Type | Description |
|--------|------|-------------|
| id | integer PK | Auto increment |
| name | text | Asset name (BCA, Gopay, Cash, etc.) |
| amount | real | Current balance |

**Note:** `amount` is automatically updated when a new month is created (carryover from previous month: `amount + totalIn - totalOut`).

---

### `investments`
Investment portfolio — per month.

| Column | Type | Description |
|--------|------|-------------|
| id | integer PK | Auto increment |
| month_id | integer FK → months.id | Related month (CASCADE delete) |
| name | text | Investment name |
| type | enum | `reksadana` / `saham` / `obligasi` |
| amount | real | Investment value |

---

### `expenses`
Budget expense templates — per month.

| Column | Type | Description |
|--------|------|-------------|
| id | integer PK | Auto increment |
| month_id | integer FK → months.id | Related month (CASCADE delete) |
| asset_id | integer nullable | Source asset |
| name | text | Expense name |
| category | enum | `fixed` / `variable` / `periodic` / `tabungan` |
| amount | real | Planned budget amount |
| period_months | integer nullable | For periodic: frequency |
| period_type | enum nullable | `month` / `year` |
| is_active | integer | 1 = active, 0 = inactive |

**Note:** This table stores **budget/plans**, not actual spending. Used for BVA comparison. When a new month is created, expenses are copied from the previous month.

---

### `incomes`
Additional income beyond salary — per month.

| Column | Type | Description |
|--------|------|-------------|
| id | integer PK | Auto increment |
| month_id | integer FK → months.id | Related month (CASCADE delete) |
| asset_id | integer nullable | Destination asset |
| name | text | Income name |
| amount | real | Amount |
| created_at | integer | Created Unix timestamp |

---

### `daily_expenses`
Actual daily spending log — per month.

| Column | Type | Description |
|--------|------|-------------|
| id | integer PK | Auto increment |
| month_id | integer FK → months.id | Related month (CASCADE delete) |
| expense_id | integer nullable | FK to expenses.id (nullable) |
| name | text | Expense name |
| amount | real | Actual amount |
| date | text | Date (YYYY-MM-DD format) |
| note | text nullable | Optional note |

**Important notes:**
- `expense_id` is nullable — if set, this entry links to an expense template for BVA aggregation
- If `expense_id` is null = **manual** expense (not counted in BVA per category, but still counted in `totalDaily`)
- `totalDaily` = **all** daily_expenses, including manual ones

---

### `asset_history`
Asset balance change history (audit log).

| Column | Type | Description |
|--------|------|-------------|
| id | integer PK | Auto increment |
| asset_id | integer FK → assets.id | Related asset (CASCADE delete) |
| month_id | integer nullable | Related month (optional) |
| type | text | Change type |
| name | text | Change description |
| amount | real | Delta change |
| balance_after | real | Balance after change |
| created_at | integer | Created Unix timestamp |

---

### `expense_projections`
Next month expense projections — per user email.

| Column | Type | Description |
|--------|------|-------------|
| id | integer PK | Auto increment |
| user_email | text | User email (from GitHub OAuth) |
| target_month | integer | Target projection month |
| target_year | integer | Target projection year |
| name | text | Projection item name |
| category | enum | `fixed` / `variable` / `tabungan` |
| amount | real | Projected amount |
| asset_id | integer nullable | Source asset |
| created_at | integer | Created Unix timestamp |
| updated_at | integer | Updated Unix timestamp |

---

## Table Relations

```
months (1) ──< investments (N)
months (1) ──< expenses (N)
months (1) ──< incomes (N)
months (1) ──< daily_expenses (N)
assets (1) ──< asset_history (N)
expenses (1) ──< daily_expenses (N)  [nullable — BVA link]
```

---

## Migrations

| File | Contents |
|------|----------|
| `0001_init.sql` | Initial tables: sessions, months, assets, expenses, incomes, daily_expenses |
| `0002_features.sql` | Early feature additions |
| `0003_assets_global.sql` | Assets made global (removed month_id from assets) |
| `0004_next_month_projection.sql` | expense_projections table |
| `0005_asset_history.sql` | asset_history table |
| `0006_investments_per_month.sql` | Investments per month |

See `migrations/MIGRATION.md` for how to run migrations.
