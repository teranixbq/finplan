# 003 — i18n: Hardcoded String Indonesia yang Tidak Ikut Berganti Bahasa

**Tanggal:** 2026-08
**Severity:** Medium (fitur ganti bahasa tidak berfungsi sempurna)
**Status:** Resolved

---

## Deskripsi Masalah

Saat user mengganti bahasa ke Inggris, beberapa teks di UI tetap tampil dalam bahasa Indonesia. Ini karena string-string tersebut di-hardcode langsung di HTML/TypeScript, bukan menggunakan fungsi `t()` atau atribut `data-i18n`.

---

## Daftar String yang Bermasalah

### `index.html`

| Lokasi | String | Seharusnya |
|--------|--------|------------|
| title tooltip | `"Lihat detail perhitungan"` | `data-i18n-title="seeDetail"` |
| section title daily | `Rincian Pemasukan` | `data-i18n="incomeSection"` |
| placeholder input | `"Nama investasi"` | `data-i18n-placeholder="placeholderInvName"` |
| placeholder input | `"Nama pengeluaran"` (3x) | `data-i18n-placeholder="placeholderExpName/ProjName/DailyName"` |
| placeholder input | `"Catatan..."` | `data-i18n-placeholder="placeholderNote"` |
| select option | `Bulan` | `data-i18n="periodMonthOption"` |
| select option | `- Pilih Sumber -` | `data-i18n="chooseSource"` |

### `pages/home.ts`

| Lokasi | String | Seharusnya |
|--------|--------|------------|
| BVA footer | `'Over Budget'` | `t('overBudget')` |
| BVA footer | `'Sisa Budget'` | `t('remainingBudget')` |

### `pages/setup.ts` dan `pages/projection.ts`

| Lokasi | String | Seharusnya |
|--------|--------|------------|
| `data-label` di `<td>` | `"Nama"`, `"Nominal"`, `"Kategori"`, `"Sumber"`, `"Tipe"`, `"Aktif"` | `data-label="${t('name')}"`, dst. |

---

## Root Cause

Tidak ada aturan yang jelas bahwa **semua string UI wajib melalui `t()`**. Developer menambahkan string langsung ke template literal atau HTML tanpa melewati sistem i18n, sehingga lolos dari perhatian saat review.

`data-label` di `<td>` diabaikan karena dianggap hanya untuk CSS mobile (pseudo-element `::before`), padahal ini tetap teks yang visible dan harus translatable.

---

## Solusi

### 1. Tambahkan keys baru ke `i18n.ts` (ID + EN)

```typescript
// Bahasa Indonesia
overBudget: 'Over Budget',
remainingBudget: 'Sisa Budget',
incomeSection: 'Rincian Pemasukan',
seeDetail: 'Lihat detail perhitungan',
chooseSource: '- Pilih Sumber -',
placeholderInvName: 'Nama investasi',
placeholderExpName: 'Nama pengeluaran',
placeholderProjName: 'Nama pengeluaran',
placeholderDailyName: 'Nama pengeluaran',
placeholderNote: 'Catatan...',
periodMonthOption: 'Bulan',

// Bahasa Inggris
overBudget: 'Over Budget',
remainingBudget: 'Remaining Budget',
incomeSection: 'Income Details',
seeDetail: 'See calculation detail',
chooseSource: '- Choose Source -',
placeholderInvName: 'Investment name',
placeholderExpName: 'Expense name',
placeholderProjName: 'Expense name',
placeholderDailyName: 'Expense name',
placeholderNote: 'Note...',
periodMonthOption: 'Month',
```

### 2. Update `index.html`

```html
<!-- Sebelum -->
<span class="section-title">Rincian Pemasukan</span>
<input placeholder="Nama investasi">
<option value="">- Pilih Sumber -</option>

<!-- Sesudah -->
<span class="section-title" data-i18n="incomeSection">Rincian Pemasukan</span>
<input data-i18n-placeholder="placeholderInvName" placeholder="Nama investasi">
<option data-i18n="chooseSource">- Pilih Sumber -</option>
```

### 3. Update `home.ts`

```typescript
// Sebelum
const selisihLabel = overBudget ? 'Over Budget' : 'Sisa Budget';

// Sesudah
const selisihLabel = overBudget ? t('overBudget') : t('remainingBudget');
```

### 4. Update `data-label` di `setup.ts` dan `projection.ts`

```typescript
// Sebelum
<td data-label="Nama">${a.name}</td>
<td data-label="Nominal">${rp(a.amount)}</td>

// Sesudah
<td data-label="${t('name')}">${a.name}</td>
<td data-label="${t('amount')}">${rp(a.amount)}</td>
```

---

## Aturan Baru (Lessons Learned)

1. **Semua string UI wajib melalui `t()`** — tidak boleh ada string bahasa Indonesia atau Inggris yang di-hardcode langsung di template literal atau HTML tanpa `data-i18n`.

2. **`data-label` di `<td>` juga harus i18n** — karena di mobile tampil sebagai label visible melalui CSS `content: attr(data-label)`.

3. **Placeholder input harus pakai `data-i18n-placeholder`** — sistem `setLang()` sudah mendukung ini.

4. **Cara audit hardcoded string:**
   ```bash
   # Cari string Indonesia di TS files
   grep -rn "'[A-Z][a-zA-Z ]*'" frontend/pages/ | grep -v "t('\|data-i18n\|//"

   # Cari placeholder hardcoded di HTML
   grep -n "placeholder=" frontend/index.html | grep -v "data-i18n-placeholder"

   # Cari data-label hardcoded di TS
   grep -rn 'data-label="[A-Z]' frontend/pages/
   ```

5. **Saat menambahkan key baru ke `id:`** — selalu tambahkan juga ke `en:` di file yang sama.

---

## Commit Terkait

- `5974193` — i18n: tambah keys baru, fix hardcoded string Indonesia di semua halaman
