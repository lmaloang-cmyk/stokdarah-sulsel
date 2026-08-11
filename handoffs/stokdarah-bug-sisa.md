# Stok Darah Sulsel — Bug Medium/High (sisa perbaikan)
Status: DITUNDA · Service: stokdarah-sulsel · Diperbarui: 2026-08-11 14:00

## Sedang dikerjakan
Sudah diperbaiki: #1 (end_time) dan #2 (config.js kosong).

## Status terakhir
- `app.js` syntax check ✓
- `js/config.js` sudah diisi kredensial Supabase ✓
- `CHANGELOG_FIXES.md` sudah dibuat entri Fix #1 & #7 ✓
- `.env` sudah dihapus dari seluruh git history ✓
- `refs/original/` backup refs sudah dihapus ✓
- `git gc --prune=now --aggressive` sudah dijalankan ✓

## Keputusan penting
- Password demo di `app.js:49` (`admin123`) sengaja tidak disamakan dengan schema (`Akusaja1.`) karena demo & prod terpisah.

## Langkah berikutnya
1. **URGENT: Regenerate service_role key di Supabase Dashboard** — langkah 3-6 di bawah ini setelah key baru ter-set
2. Fix #3: `anti-freeze.sql` vs `schema.sql` inkonsisten (kolom is_frozen/last_active tidak ada di schema)
3. Fix #4: `api/freeze.js` akses kolom `is_frozen`/`last_active` yang tidak ada → cron job gagal silent
4. Fix #5: SW cache `js/config.js` → config lama stuck di cache
5. Fix #6: Password demo ≠ password schema (low, opsional)

## Jangan lakukan (jebakan yang sudah ditemukan)
- Jangan push force ke remote sebelum service_role key baru sudah ter-set di Vercel.
- Jangan ubah password schema.sql tanpa konfirmasi user (ini kredensial akun utama).
