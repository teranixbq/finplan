# 002 — Mobile Responsive CSS: Konflik Media Query & Layout Rusak

**Tanggal:** 2026-08
**Severity:** High (tampilan rusak di mobile, tapi tidak crash)
**Status:** Resolved

---

## Deskripsi Masalah

Beberapa masalah UI mobile yang ditemukan sekaligus:

1. **Income table desktop** — kolom "Nama" tidak tampil sama sekali di desktop
2. **Income table mobile** — header "Tanggal" dan "Nominal" masih tampil padahal seharusnya hanya "Nama"
3. **Nominal font terlalu besar** di income table mobile (28px, harusnya 12px)
4. **Proyeksi section** — dua card (plan + compare) lebarnya tidak sama di desktop
5. **Section header proyeksi sesak** di mobile — title + 2 tombol tidak wrap
6. **Padding container** terlalu besar di mobile
7. **Semua tombol Hapus** masih teks, belum pakai icon trash

---

## Root Cause

### 1. Konflik media query income table (masalah utama)

Ada **dua media query berbeda** yang mengatur class income table:

```css
/* @media (max-width: 768px) — line 1172 */
.income-cell-main { display: table-cell; }       /* AKTIF di mobile */
.income-desktop { display: none !important; }

/* @media (max-width: 600px) — line 1484 (DUPLIKAT) */
.income-cell-main { display: table-cell !important; }
.income-desktop { display: none !important; }
```

Breakpoint tidak konsisten (600px vs 768px). Yang lebih parah: kedua block ini konflik dan tidak ada yang benar-benar mengontrol desktop dengan jelas.

### 2. Class name collision: `.income-amount`

Class `.income-amount` dipakai di **dua tempat berbeda**:

```css
/* Stat card di homepage — font besar */
.income-amount { font-size: 28px; font-weight: 800; }

/* Row di income table — harusnya kecil */
/* tidak ada CSS terpisah → kena override dari stat card */
```

Di `daily.ts`, row income table juga render `<span class="income-amount">` — kena style 28px dari stat card.

### 3. `proj-compare-wrap` punya `max-width: 860px`

```css
.proj-compare-wrap {
  max-width: 860px;   /* ← ini yang bikin lebar berbeda */
  margin: 0 auto;
}
```

Sedangkan `.proj-plan-wrap` tidak punya `max-width`, jadi full width. Hasilnya dua card lebarnya berbeda.

### 4. Tidak ada kolom Nama di desktop income table

Struktur HTML row income table:

```html
<!-- income-cell-main: berisi nama — tapi di-hide di desktop -->
<td class="income-cell-main">...</td>
<!-- income-desktop: tidak ada kolom Nama -->
<td class="income-cell-date income-desktop">Tanggal</td>
<td class="income-cell-amount income-desktop">Nominal</td>
<td class="income-cell-action income-desktop">Aksi</td>
```

Tidak ada kolom Nama untuk desktop.

---

## Solusi

### 1. Hapus duplikat `@media (max-width: 600px)`, konsolidasikan ke `768px`

```css
/* Hapus seluruh block @media (max-width: 600px) untuk income */
/* Pindahkan semua styles ke @media (max-width: 768px) yang sudah ada */
```

### 2. Pisahkan thead desktop dan mobile di `index.html`

```html
<thead class="income-thead-desktop"><tr>
  <th>Nama</th>
  <th>Tanggal</th>
  <th>Nominal</th>
  <th></th>
</tr></thead>
<thead class="income-thead-mobile"><tr>
  <th>Nama</th>
</tr></thead>
```

CSS:
```css
/* Default desktop */
.income-thead-mobile { display: none; }
.income-thead-desktop { display: table-header-group; }

/* Mobile */
@media (max-width: 768px) {
  .income-thead-desktop { display: none !important; }
  .income-thead-mobile { display: table-header-group !important; }
}
```

### 3. Tambah kolom Nama di desktop row (`daily.ts`)

```typescript
// Sebelum: tidak ada kolom Nama di desktop
// Sesudah:
<td class="income-cell-name income-desktop">${inc.name}</td>
<td class="income-cell-date income-desktop">${dateStr}</td>
<td class="income-cell-amount income-desktop" style="text-align:right">${rp(inc.amount)}</td>
<td class="income-cell-action income-desktop">...</td>
<td class="income-cell-main">...</td>  <!-- hanya di mobile -->
```

### 4. Rename class `income-amount` di row menjadi `income-row-amount`

```typescript
// daily.ts — row income table
// Sebelum:
<span class="income-amount">${rp(inc.amount)}</span>
// Sesudah:
<span class="income-row-amount">${rp(inc.amount)}</span>
```

CSS:
```css
/* Di dalam @media (max-width: 768px) */
.income-row-amount { font-size: 12px; font-weight: 600; color: var(--canopy-bright); }
```

### 5. Hapus `max-width` dari `.proj-compare-wrap`

```css
/* Sebelum */
.proj-compare-wrap { padding: 20px; max-width: 860px; margin: 0 auto; }

/* Sesudah */
.proj-compare-wrap { padding: 20px; }
```

### 6. Standarisasi CSS variables radius + mobile card padding

```css
/* Sebelum */
--radius: 12px;
--radius-lg: 22px;

/* Sesudah — lebih proporsional */
--radius: 10px;
--radius-lg: 16px;
```

Mobile card padding:
```css
@media (max-width: 768px) {
  .card { padding: 14px 16px; }
  .section-header { flex-wrap: wrap; gap: 8px; }
  .proj-plan-actions { width: 100%; justify-content: flex-start; }
}
```

### 7. Ganti semua tombol hapus ke icon trash

```typescript
// Sebelum
<button class="btn-icon danger">${t('delete')}</button>

// Sesudah
<button class="btn-icon danger"><i class="fa-solid fa-trash"></i></button>
```

---

## Aturan Baru (Lessons Learned)

1. **Hanya satu breakpoint mobile: `768px`** — tidak boleh ada `@media (max-width: 600px)` untuk mobile.

2. **Jangan pakai class name yang sama untuk dua komponen berbeda** — contoh: `.income-amount` di stat card vs row table. Gunakan nama spesifik: `.income-row-amount`, `.income-stat-amount`.

3. **Pisahkan thead desktop/mobile** untuk table yang punya layout berbeda antara desktop dan mobile — gunakan `income-thead-desktop` dan `income-thead-mobile`.

4. **Semua container card harus sama lebar** — hindari `max-width` pada card yang sejajar, kecuali di level page container.

5. **CSS variables radius harus konsisten** — semua card/table pakai `var(--radius)` atau `var(--radius-lg)`, tidak boleh hardcode nilai pixel.

---

## Commit Terkait

- `3e078cc` — trash icons, income desktop fix, proj/setup containers
- `bd0bc0e` — income table desktop nama column + proyeksi layout
- `7e564eb` — proj-compare-wrap hapus max-width
- `c83d992` — pisah thead desktop/mobile income table
- `5de82ec` — rename income-amount ke income-row-amount
- `e731eb3` — global radius dikecilkan, card padding mobile, section-header wrap
