# Database Schema — FinPlan

Database: Cloudflare D1 (SQLite)
ORM: Drizzle ORM
Schema file: `src/db/schema.ts`

---

## Tabel

### `sessions`
Menyimpan session login user via GitHub OAuth.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | integer PK | Auto increment |
| token | text UNIQUE | Session token (random 32 bytes hex) |
| github_email | text | Email GitHub user |
| github_name | text | Nama GitHub user |
| expires_at | integer | Unix timestamp expiry session |
| created_at | integer | Unix timestamp dibuat |

---

### `months`
Satu baris = satu bulan periode keuangan.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | integer PK | Auto increment |
| month | integer | Bulan (1-12) |
| year | integer | Tahun (mis. 2025) |
| salary | real | Gaji pokok bulan ini |
| salary_date | integer | Tanggal gajian (default 28) |
| created_at | integer | Unix timestamp dibuat |

**Constraint:** month + year kombinasi unik (dicek manual di route, bukan DB constraint).

---

### `assets`
Dana cair — rekening, e-wallet, cash. **Global (tidak per bulan).**

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | integer PK | Auto increment |
| name | text | Nama asset (BCA, Gopay, Cash, dll) |
| amount | real | Saldo saat ini |

**Catatan:** `amount` diupdate otomatis saat bulan baru dibuat (carryover dari bulan sebelumnya: `amount + totalIn - totalOut`).

---

### `investments`
Portofolio investasi — per bulan.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | integer PK | Auto increment |
| month_id | integer FK → months.id | Bulan terkait (CASCADE delete) |
| name | text | Nama investasi |
| type | enum | `reksadana` / `saham` / `obligasi` |
| amount | real | Nilai investasi |

---

### `expenses`
Template pengeluaran budget — per bulan.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | integer PK | Auto increment |
| month_id | integer FK → months.id | Bulan terkait (CASCADE delete) |
| asset_id | integer nullable | Asset sumber dana |
| name | text | Nama pengeluaran |
| category | enum | `fixed` / `variable` / `periodic` / `tabungan` |
| amount | real | Budget yang direncanakan |
| period_months | integer nullable | Untuk periodic: frekuensi |
| period_type | enum nullable | `month` / `year` |
| is_active | integer | 1 = aktif, 0 = nonaktif |

**Catatan:** Tabel ini adalah **budget/rencana**, bukan pengeluaran aktual. Dipakai untuk BVA comparison. Saat bulan baru dibuat, data expenses di-copy dari bulan sebelumnya.

---

### `incomes`
Pemasukan tambahan di luar gaji — per bulan.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | integer PK | Auto increment |
| month_id | integer FK → months.id | Bulan terkait (CASCADE delete) |
| asset_id | integer nullable | Asset tujuan dana masuk |
| name | text | Nama pemasukan |
| amount | real | Nominal |
| created_at | integer | Unix timestamp dibuat |

---

### `daily_expenses`
Log pengeluaran aktual harian — per bulan.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | integer PK | Auto increment |
| month_id | integer FK → months.id | Bulan terkait (CASCADE delete) |
| expense_id | integer nullable | FK ke expenses.id (nullable) |
| name | text | Nama pengeluaran |
| amount | real | Nominal aktual |
| date | text | Tanggal (format YYYY-MM-DD) |
| note | text nullable | Catatan opsional |

**Catatan penting:**
- `expense_id` nullable — jika diisi, entry ini di-link ke expense template untuk BVA aggregation
- Jika `expense_id` null = pengeluaran **manual** (tidak masuk BVA per kategori, tapi tetap masuk `totalDaily`)
- `totalDaily` = **semua** daily_expenses, termasuk yang manual

---

### `asset_history`
Riwayat perubahan saldo asset (audit log).

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | integer PK | Auto increment |
| asset_id | integer FK → assets.id | Asset terkait (CASCADE delete) |
| month_id | integer nullable | Bulan terkait (opsional) |
| type | text | Tipe perubahan |
| name | text | Deskripsi perubahan |
| amount | real | Delta perubahan |
| balance_after | real | Saldo setelah perubahan |
| created_at | integer | Unix timestamp dibuat |

---

### `expense_projections`
Proyeksi pengeluaran bulan depan — per user email.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | integer PK | Auto increment |
| user_email | text | Email user (dari GitHub OAuth) |
| target_month | integer | Bulan target proyeksi |
| target_year | integer | Tahun target proyeksi |
| name | text | Nama item proyeksi |
| category | enum | `fixed` / `variable` / `tabungan` |
| amount | real | Nominal proyeksi |
| asset_id | integer nullable | Asset sumber dana |
| created_at | integer | Unix timestamp dibuat |
| updated_at | integer | Unix timestamp diupdate |

---

## Relasi Antar Tabel

```
months (1) ──< investments (N)
months (1) ──< expenses (N)
months (1) ──< incomes (N)
months (1) ──< daily_expenses (N)
assets (1) ──< asset_history (N)
expenses (1) ──< daily_expenses (N)  [nullable — BVA link]
```

---

## Migrasi

| File | Isi |
|------|-----|
| `0001_init.sql` | Tabel awal: sessions, months, assets, expenses, incomes, daily_expenses |
| `0002_features.sql` | Tambahan fitur awal |
| `0003_assets_global.sql` | Assets dijadikan global (hapus month_id dari assets) |
| `0004_next_month_projection.sql` | Tabel expense_projections |
| `0005_asset_history.sql` | Tabel asset_history |
| `0006_investments_per_month.sql` | Investments per month |

Lihat `migrations/MIGRATION.md` untuk cara menjalankan migrasi.
