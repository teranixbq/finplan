# Business Logic — Perhitungan Keuangan FinPlan

File: `src/routes/months.ts` — fungsi `GET /:id/summary`

---

## Konsep Utama

FinPlan membedakan dua jenis data pengeluaran:

| Tipe | Sumber | Tujuan |
|------|--------|--------|
| **Budget** | `expenses` table | Rencana pengeluaran, dipakai untuk BVA comparison |
| **Aktual** | `daily_expenses` table | Pengeluaran nyata yang sudah terjadi |

---

## Formula Perhitungan Summary

### Dana Cair
```
totalCash = SUM(assets.amount)
```
Saldo real-time semua akun dana cair (BCA, Gopay, Cash, dll). Bukan snapshot — selalu nilai terkini.

### Total Investasi
```
totalInvestment = SUM(investments.amount) WHERE month_id = currentMonth
```

### Total Pengeluaran Aktual (Daily)
```
totalDaily = SUM(daily_expenses.amount) WHERE month_id = currentMonth
```
Mencakup SEMUA pengeluaran yang sudah dicatat — baik yang linked ke expense template (`expense_id` tidak null) maupun yang manual (`expense_id` null).

### Sisa Sebelum Gajian ⭐
```
sisaSebelumGajian = (totalCash + totalInvestment) - totalDaily
```
**Logika:** Semua dana yang dimiliki saat ini dikurangi pengeluaran aktual yang sudah terjadi. Investasi ikut dihitung karena merupakan bagian dari total kekayaan user, meski tidak liquid.

### Sisa Akhir Bulan (Estimasi)
```
sisaAkhirBulan = sisaSebelumGajian + month.salary
```
Estimasi kondisi keuangan setelah gaji masuk di akhir bulan.

---

## Budget Breakdown

Untuk keperluan kategori, budget dihitung dari `expenses` yang `is_active = 1`:

```
totalFixed    = SUM(expenses.amount) WHERE category = 'fixed'    AND is_active = 1
totalVariable = SUM(expenses.amount) WHERE category = 'variable' AND is_active = 1
totalPeriodic = SUM(expenses.amount) WHERE category = 'periodic' AND is_active = 1
totalTabungan = SUM(expenses.amount) WHERE category = 'tabungan' AND is_active = 1
totalBudget   = totalFixed + totalVariable + totalPeriodic + totalTabungan
```

**Catatan:** `totalBudget` adalah **rencana** pengeluaran bulan ini. Angka ini **tidak** dipakai dalam perhitungan `sisaSebelumGajian` — hanya untuk BVA comparison.

---

## Budget vs Actual (BVA)

Ditampilkan sebagai horizontal progress bar per expense item.

**Aggregasi actual per expense:**
```javascript
actualMap[expenseId] = SUM(daily_expenses.amount) WHERE expense_id = expenseId
```

**Per item:**
```
budget  = expenses.amount
actual  = actualMap[expenses.id] || 0
pct     = actual / budget * 100

barColor:
  pct >= 100 → merah  (#d98a7f) — over budget
  pct >= 80  → kuning (#d9b877) — warning
  pct < 80   → hijau  (#8fb88f) — aman
```

**Footer BVA:**
```
totalActual (BVA) = SUM(actualMap values)  ← hanya yang linked ke expense template
totalBudget       = SUM(expenses.amount)
selisih           = totalBudget - totalActual
```

**Penting:** `totalActual` di BVA footer ≠ `totalDaily`. BVA hanya menghitung daily expenses yang linked ke expense template (`expense_id != null`). Daily manual tidak masuk BVA tapi tetap masuk `sisaSebelumGajian`.

---

## Carryover Bulan Baru

Saat user membuat bulan baru, sistem otomatis:

1. **Copy expenses** dari bulan sebelumnya ke bulan baru
2. **Update saldo assets** dengan formula carryover:
   ```
   carryover = asset.amount + totalIn - totalOut
   asset.amount = MAX(0, carryover)
   ```
   Dimana `totalIn` = incomes bulan lalu untuk asset tersebut, `totalOut` = expenses aktif bulan lalu untuk asset tersebut.

---

## Kategori Expenses

| Kategori | Deskripsi | Contoh |
|----------|-----------|--------|
| `fixed` | Pengeluaran tetap bulanan | Cicilan, sewa kos |
| `variable` | Pengeluaran variabel | Makan, transport |
| `periodic` | Pengeluaran berkala (tidak tiap bulan) | Langganan tahunan |
| `tabungan` | Tabungan / saving | Dana darurat, nabung |

**Catatan:** Tidak ada kategori `daily` di `expenses` table. `daily_expenses` adalah tabel terpisah untuk log aktual.

---

## Breakdown Modal (UI)

Saat user klik icon ℹ️ di card summary:

**Sisa Sebelum Gajian:**
```
Dana Cair          : totalCash
+ Investasi        : totalInvestment
─────────────────────────────────
Total Dana         : totalCash + totalInvestment

- Linked ke Budget : SUM(daily dimana expense_id != null)
- Manual           : SUM(daily dimana expense_id == null)
─────────────────────────────────
- Total Pengeluaran: totalDaily

= Sisa Sebelum Gajian: sisaSebelumGajian
```

**Sisa Akhir Bulan:**
```
Sisa Sebelum Gajian: sisaSebelumGajian
+ Gaji             : month.salary
─────────────────────────────────
= Estimasi Akhir Bulan: sisaAkhirBulan
```

---

## Rata-rata Pengeluaran Harian

```
avgDailyExpense = totalDaily / jumlah_hari_unik_yang_ada_transaksi
```
Bukan dibagi hari kalender, tapi hari yang benar-benar ada transaksinya.
