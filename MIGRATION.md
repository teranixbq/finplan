# Panduan Migrasi Database (Cloudflare D1 + Wrangler)

Dokumen ini menjelaskan cara menjalankan migrasi database FinPlan ke Cloudflare D1
menggunakan Wrangler, baik untuk lingkungan **lokal** maupun **produksi (remote)**.

## Ringkasan

- Database: **Cloudflare D1** (SQLite)
- Nama database: `finplan`
- Binding: `DB`
- Folder migrasi: `drizzle/migrations/`
- Konfigurasi `migrations_dir` sudah diset di `wrangler.jsonc`

File migrasi diberi nomor urut:

```
drizzle/migrations/
├── 0001_init.sql
├── 0002_features.sql
├── 0003_assets_global.sql
└── 0004_next_month_projection.sql   <-- migrasi terbaru (tabel proyeksi bulan depan)
```

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

Perintah ini membuat file `.sql` baru di `drizzle/migrations/`.
Tinjau isinya, lalu jalankan langkah **Menjalankan Migrasi** di atas.

> Catatan: untuk perubahan kompleks (rename/drop kolom di SQLite), kadang
> perlu menulis SQL migrasi manual seperti pada `0003_assets_global.sql`.

---

## 5. Menjalankan SQL Manual (opsional)

Jika perlu menjalankan satu file SQL secara langsung (mis. debugging atau
seed data), gunakan:

```bash
# Lokal
npx wrangler d1 execute finplan --local --file=drizzle/migrations/0004_next_month_projection.sql

# Remote
npx wrangler d1 execute finplan --remote --file=drizzle/migrations/0004_next_month_projection.sql
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
