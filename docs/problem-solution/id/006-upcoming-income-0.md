# 006 — Pemasukan Mendatang Selalu Rp0

## 📝 Deskripsi Masalah
Card "Pemasukan Mendatang" di halaman Beranda (Home) menampilkan nilai `Rp0` meskipun user memiliki gaji (salary) yang sudah diatur (misalnya Rp6.500.000). Status badge juga berubah menjadi "KRITIS" karena nilainya dianggap nol.

## 🔍 Root Cause (Akar Masalah)
Pada file `frontend/pages/home.ts`, element `val-salary` (card Pemasukan Mendatang) di-assign dengan nilai `s.totalIncomes`:
```typescript
if (salaryEl) salaryEl.textContent = rp(s.totalIncomes || 0);
```
Variabel `s.totalIncomes` merupakan akumulasi dari tabel `incomes` (pemasukan tambahan yang sudah dicatat pada bulan tersebut). Karena pada awal bulan biasanya belum ada pemasukan tambahan yang dicatat, maka nilainya adalah 0.

Padahal secara konsep bisnis, "Pemasukan Mendatang" (Upcoming Income) merujuk pada **gaji utama** (`salary`) yang *akan* diterima pada tanggal gajian (biasanya tanggal 28), bukan akumulasi pendapatan tambahan yang sudah tercatat.

## 💡 Solusi
Mengubah referensi nilai yang ditampilkan pada card "Pemasukan Mendatang" dari `totalIncomes` menjadi `month.salary`.

**Sebelum (frontend/pages/home.ts):**
```typescript
const salaryEl = el('val-salary');
if (salaryEl) salaryEl.textContent = rp(s.totalIncomes || 0);
```

**Sesudah (frontend/pages/home.ts):**
```typescript
const salaryEl = el('val-salary');
if (salaryEl) salaryEl.textContent = rp(s.month.salary);
```

## 🎓 Lessons Learned / Aturan Baru
1. **Pemahaman Konsep Data:** `totalIncomes` (dari tabel `incomes`) adalah pemasukan *aktual tambahan* yang sudah terjadi. Sedangkan "Pemasukan Mendatang" adalah *rencana/proyeksi gaji* (`salary` dari tabel `months`). Jangan mencampuradukkan aktual dengan rencana.
2. **Kesesuaian Label:** Jika UI label adalah "Upcoming Income" / "Pemasukan Mendatang", pastikan data yang diambil adalah sumber dana di masa depan, bukan rekapitulasi data masa lalu (kecuali untuk tujuan estimasi).
