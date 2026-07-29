# Panduan Migrasi Database (Cloudflare D1 + Wrangler)

Dokumen ini menjelaskan cara menjalankan migrasi database FinPlan ke Cloudflare D1
menggunakan Wrangler, baik untuk lingkungan **lokal** maupun **produksi (remote)**.

## Ringkasan

- Database: **Cloudflare D1** (SQLite)
- Nama database: `finplan`
- Binding: `DB`
- Folder migrasi: `migrations/`
- Konfigurasi `migrations_dir` sudah diset di `wrangler.jsonc`

File migrasi diberi nomor urut:

```
migrations/
├── 0001_init.sql                      — tabel awal (sessions, months, assets, expenses, incomes, daily_expenses)
├── 0002_features.sql                  — tambahan fitur awal
├── 0003_assets_global.sql             — assets dijadikan global (hapus month_id dari assets)
├── 0004_next_month_projection.sql     — tabel expense_projections
├── 0005_reset_data.sql                — one-time data reset (hapus semua row, schema tidak berubah)
└── 0006_asset_history.sql             — tabel asset_history (audit log perubahan saldo asset)
```

> **PERINGATAN:** `0005_reset_data.sql` adalah migrasi destruktif — menghapus SEMUA data dari semua tabel. Sudah dijalankan sekali di production. Jangan jalankan ulang.

---

## 1. Prasyarat

Pastikan sudah login ke Cloudflare:

```bash
npx wrangler login
```

Cek daftar database D1 yang tersedia:

```bash
npx wrangler d1 list
```

---

## 2. Menjalankan Migrasi

### a. Lokal (development)

Terapkan semua migrasi yang belum dijalankan ke database D1 **lokal**
(dipakai saat `npm run dev`):

```bash
npm run db:migrate:local
```

Atau langsung dengan wrangler:

```bash
npx wrangler d1 migrations apply finplan --local
```

### b. Remote (produksi)

Terapkan migrasi ke database D1 **produksi**:

```bash
npm run db:migrate:remote
```

Atau langsung dengan wrangler:

```bash
npx wrangler d1 migrations apply finplan --remote
```

> Wrangler otomatis melacak migrasi yang sudah dijalankan lewat tabel
> `d1_migrations`, jadi hanya file baru yang akan diterapkan. Aman dijalankan
> berulang kali.

---

## 3. Melihat Migrasi yang Belum Diterapkan

```bash
# Lokal
npx wrangler d1 migrations list finplan --local

# Remote
npx wrangler d1 migrations list finplan --remote
```

---

## 4. Membuat Migrasi Baru (dari perubahan schema)

Schema didefinisikan di `src/db/schema.ts`. Setelah mengubah schema,
generate file migrasi baru dengan Drizzle Kit:

```bash
npm run db:generate
```

Perintah ini membuat file `.sql` baru di `migrations/`.
Tinjau isinya, lalu jalankan langkah **Menjalankan Migrasi** di atas.

> Catatan: untuk perubahan kompleks (rename/drop kolom di SQLite), kadang
> perlu menulis SQL migrasi manual seperti pada `0003_assets_global.sql`.

---

## 5. Menjalankan SQL Manual (opsional)

Jika perlu menjalankan satu file SQL secara langsung (mis. debugging atau
seed data), gunakan:

```bash
# Lokal
npx wrangler d1 execute finplan --local --file=migrations/0004_next_month_projection.sql

# Remote
npx wrangler d1 execute finplan --remote --file=migrations/0004_next_month_projection.sql
```

Menjalankan query ad-hoc:

```bash
npx wrangler d1 execute finplan --local --command "SELECT name FROM sqlite_master WHERE type='table';"
```

---

## 6. Urutan Deploy yang Disarankan

1. Terapkan migrasi ke remote:
   ```bash
   npm run db:migrate:remote
   ```
2. Deploy Worker:
   ```bash
   npm run deploy
   ```

Selalu jalankan migrasi **sebelum** deploy agar skema database sudah siap
saat kode baru aktif.

---

## Migrasi 0004 — Tabel Proyeksi Bulan Depan

Migrasi `0004_next_month_projection.sql` menambahkan tabel `expense_projections`
untuk menyimpan rencana pengeluaran bulan depan. Data otomatis disalin dari
pengeluaran bulan ini (kategori `fixed`, `variable`, `tabungan` — `periodic`
tidak disertakan) saat pertama kali dibuka, dan bisa diubah manual.

Jalankan untuk mengaktifkan fitur ini:

```bash
npm run db:migrate:local    # lokal
npm run db:migrate:remote   # produksi
```

---

## Migrasi 0005 — One-time Data Reset

> **PERINGATAN: DESTRUKTIF.** Migrasi ini menghapus SEMUA row dari semua tabel.
> Schema tidak berubah. Sudah dijalankan sekali di production. **Jangan jalankan ulang.**

Migrasi `0005_reset_data.sql` membersihkan semua data:
- Menghapus semua row dari: `expense_projections`, `daily_expenses`, `incomes`, `expenses`, `investments`, `assets`, `months`, `sessions`
- Mereset AUTOINCREMENT counter (`sqlite_sequence`) agar ID mulai dari 1 lagi

Digunakan saat perlu full reset data development/production.

---

## Migrasi 0006 — Tabel Asset History

Migrasi `0006_asset_history.sql` menambahkan tabel `asset_history` untuk mencatat
riwayat perubahan saldo asset dana cair (audit log).

Setiap perubahan saldo dicatat dengan:
- `asset_id` — asset yang berubah
- `month_id` — bulan terkait (nullable)
- `type` — tipe perubahan (contoh: `'income'`)
- `name` — deskripsi perubahan (nama pemasukan)
- `amount` — delta perubahan (positif = tambah)
- `balance_after` — saldo setelah perubahan

Index `idx_asset_history_asset` dibuat untuk query cepat per asset.

```bash
npm run db:migrate:local    # lokal
npm run db:migrate:remote   # produksi
```
