# 004 — Field Name Mismatch: `totalIncome` vs `totalIncomes`

**Tanggal:** 2026-08
**Severity:** Medium (nominal pemasukan selalu tampil Rp0 di homepage)
**Status:** Resolved

---

## Deskripsi Masalah

Card "Pemasukan Mendatang" di homepage selalu menampilkan `Rp0` meskipun data pemasukan sudah ada. Selain itu, ada karakter `-` yang muncul di bawah nominal tanpa tujuan jelas.

---

## Root Cause

### 1. Field name mismatch

Di `frontend/pages/home.ts:57`, kode menggunakan `s.totalIncome`:

```typescript
if (salaryEl) salaryEl.textContent = rp(s.totalIncome || 0);
```

Tapi di `src/shared/types.ts:92`, field didefinisikan sebagai `totalIncomes` (ada huruf `s` di akhir):

```typescript
totalIncomes: number;
```

Karena TypeScript strict mode tidak menangkap ini (field dianggap `undefined`), ekspresi `s.totalIncome || 0` selalu return `0` → tampil `Rp0`.

### 2. Karakter `-` yang tidak perlu

Di `index.html` ada elemen:

```html
<div class="income-sub" id="income-sub">-</div>
```

Elemen ini tidak pernah diisi oleh `home.ts` (tidak ada referensi ke `income-sub` di JS), sehingga karakter `-` tampil statis tanpa fungsi.

---

## Solusi

### 1. Fix field name di `home.ts`

```typescript
// Sebelum
if (salaryEl) salaryEl.textContent = rp(s.totalIncome || 0);

// Sesudah
if (salaryEl) salaryEl.textContent = rp(s.totalIncomes || 0);
```

### 2. Hapus elemen `income-sub` dari `index.html`

```html
<!-- Sebelum -->
<div class="income-amount" id="val-salary">Rp0</div>
<div class="income-sub" id="income-sub">-</div>

<!-- Sesudah -->
<div class="income-amount" id="val-salary">Rp0</div>
```

---

## Aturan Baru (Lessons Learned)

1. **Selalu cross-check field name antara `src/shared/types.ts` dan `frontend/`** — `types.ts` adalah sumber kebenaran untuk nama field API response. Cek dengan:
   ```bash
   grep -n "totalIncome\b" frontend/pages/home.ts src/shared/types.ts
   ```

2. **Hapus elemen HTML yang tidak digunakan** — elemen dengan `id` yang tidak direferensikan di JS harus dihapus agar tidak menimbulkan kebingungan.

3. **Gunakan TypeScript strict mode secara konsisten** — aktifkan `noUncheckedIndexedAccess` dan `exactOptionalPropertyTypes` untuk menangkap akses field yang tidak ada di type.

---

## Commit Terkait

- `0bce6ab` — fix: totalIncome -> totalIncomes field name, hapus income-sub strip
