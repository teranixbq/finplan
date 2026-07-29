# 001 — Blank Homepage: Null Reference pada Element yang Dihapus

**Tanggal:** 2025-07
**Severity:** Critical (halaman tidak bisa dirender sama sekali)
**Status:** Resolved

---

## Deskripsi Masalah

Homepage FinPlan menampilkan halaman kosong (blank). Tidak ada data yang tampil — summary grid, income card, BVA chart, semua kosong. Tab Setup juga tidak menampilkan data asset/expense yang sudah disimpan.

---

## Root Cause

Di `public/app.js`, fungsi `renderHome()` mengandung block code yang me-reference element HTML `breakdown-content`:

```javascript
// app.js — renderHome(), baris ~315
const bEl = el('breakdown-content');
const activeExp = S.expenses.filter(e => e.isActive && e.category !== 'daily');
if (!activeExp.length) {
  bEl.innerHTML = `...`;  // ← CRASH: bEl adalah null
}
```

Element `#breakdown-content` sebelumnya dihapus dari `index.html` saat fitur "Rincian Pengeluaran" dibuang dari homepage. Namun block JS yang me-reference element tersebut **tidak ikut dihapus**.

Hasil: `el('breakdown-content')` return `null`, dan `bEl.innerHTML = ...` throw `TypeError: Cannot set properties of null`. Error ini terjadi di tengah `renderHome()`, menyebabkan eksekusi berhenti sebelum:
- Summary grid values diisi
- `renderCharts()` dipanggil
- `renderIncomes()` dipanggil
- `renderSetup()` juga terpengaruh karena dipanggil setelah `renderHome()` dari `loadMonthData()`

---

## Mengapa Ini Penting

Ini adalah pola yang berpotensi berulang: setiap kali elemen HTML dihapus dari `index.html`, semua referensi di `app.js` yang menggunakan `el('id-element')` dan langsung mengakses property-nya (tanpa null check) akan crash.

Fungsi `el()` adalah wrapper `document.getElementById()` yang return `null` jika element tidak ditemukan. Tidak ada error handling bawaan.

---

## Solusi

Hapus block JS yang me-reference element yang sudah tidak ada di DOM:

```javascript
// SEBELUM (crash):
const bEl = el('breakdown-content');
const activeExp = S.expenses.filter(e => e.isActive && e.category !== 'daily');
if (!activeExp.length) {
  bEl.innerHTML = `<div class="breakdown-row total">...</div>`;
} else {
  bEl.innerHTML = activeExp.map(e => `...`).join('') + `...`;
}

// SESUDAH (dihapus sepenuhnya):
// — tidak ada —
```

---

## Pelajaran & Best Practices

1. **Selalu cari referensi sebelum menghapus element HTML.** Sebelum menghapus `id` dari HTML, grep dulu di `app.js`:
   ```bash
   grep -n "element-id" public/app.js
   ```

2. **Gunakan optional chaining untuk DOM access.** Untuk element yang mungkin tidak selalu ada:
   ```javascript
   // Aman:
   const bEl = el('breakdown-content');
   if (bEl) bEl.innerHTML = `...`;

   // Atau:
   el('breakdown-content')?.innerHTML = `...`;
   ```

3. **Satu JS error bisa membuat seluruh halaman blank.** `renderHome()` tidak di-wrap try/catch, jadi satu TypeError menghentikan semua rendering. Pertimbangkan untuk menambahkan error boundary:
   ```javascript
   function renderHome() {
     try {
       // ... render logic
     } catch (e) {
       console.error('renderHome error:', e);
     }
   }
   ```

4. **Cek `renderHome()` setiap kali ada perubahan struktur HTML di homepage.**

---

## Commit Terkait

- Fix: `git log --oneline` — commit yang menghapus breakdown block dari `renderHome()`
