# 005 — Toggle Switch: Aktif/Nonaktif Expenses

**Tanggal:** 2026-08
**Severity:** Low (UX improvement, bukan bug kritis)
**Status:** Resolved

---

## Deskripsi Masalah

Tombol aktif/nonaktif pada tabel expenses di halaman Setup sebelumnya menggunakan tombol teks biasa (misal: "Nonaktifkan" / "Aktifkan"). Ini:

1. Tidak konsisten secara visual dengan pola toggle modern
2. Memakan lebar kolom lebih besar dari yang diperlukan
3. Tidak memberikan feedback visual status aktif/nonaktif secara intuitif

---

## Solusi

Ganti tombol teks dengan **toggle switch CSS** — komponen checkbox yang di-style sebagai switch on/off.

### HTML Pattern

```html
<label class="toggle-switch">
  <input
    type="checkbox"
    class="toggle-input"
    data-id="${expense.id}"
    ${expense.isActive ? 'checked' : ''}
  />
  <span class="toggle-slider"></span>
</label>
```

### CSS Implementation

```css
/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  cursor: pointer;
}

.toggle-input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 22px;
  transition: background 0.2s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  left: 3px;
  top: 3px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle-input:checked + .toggle-slider {
  background: var(--accent);
}

.toggle-input:checked + .toggle-slider::before {
  transform: translateX(18px);
}
```

### JavaScript Event Handler

```typescript
// Event listener di setup.ts
el('expense-table')?.addEventListener('change', async (e) => {
  const input = e.target as HTMLInputElement;
  if (!input.classList.contains('toggle-input')) return;
  const id = Number(input.dataset.id);
  const isActive = input.checked;
  await api.patch(`/expenses/${id}`, { isActive });
  await reloadData();
});
```

---

## Keputusan Desain

| Aspek | Keputusan |
|-------|-----------|
| Width | 40px — cukup untuk touch target mobile |
| Color aktif | `var(--accent)` — konsisten dengan warna aksen global |
| Color nonaktif | `rgba(255, 255, 255, 0.15)` — subtle, sesuai glassmorphism |
| Transisi | 0.2s — cukup cepat, tidak terlalu lambat |
| Border-radius | 22px (pill shape) — mengikuti `--radius-lg` spirit |

---

## Aturan Baru (Lessons Learned)

1. **Gunakan toggle switch untuk semua state boolean di tabel** — lebih intuitif daripada tombol teks, lebih hemat ruang kolom.

2. **Naming convention toggle switch:**
   - Container: `.toggle-switch`
   - Input: `.toggle-input` (dengan `data-id`)
   - Slider: `.toggle-slider`
   - Jangan buat nama class baru yang berbeda untuk komponen toggle lainnya — gunakan class yang sama agar CSS tidak duplikat.

3. **Event delegation** — pasang satu `addEventListener('change')` di container tabel, bukan per-row, untuk menghindari memory leak saat tabel di-re-render.

4. **Accessibility** — `<label>` wrapping `<input type="checkbox">` sudah cukup untuk screen reader. Tidak perlu `aria-label` tambahan jika label kontainer sudah jelas.

---

## Commit Terkait

- `df2cba5` — feat: toggle switch CSS untuk aktif/nonaktif expenses
