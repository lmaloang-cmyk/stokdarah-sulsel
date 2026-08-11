# Stok Darah Sulsel — Bug Medium/High (sisa perbaikan)
Status: **SELESAI** · Service: stokdarah-sulsel · Diperbarui: 2026-08-11 15:00

## Sudah diperbaiki
- ✅ Fix #1: `handleAddEvent` end_time = start_time
- ✅ Fix #2: `js/config.js` kosong
- ✅ Fix #3: `schema.sql` belum punya kolom `is_frozen`/`last_active`
- ✅ Fix #4: `api/freeze.js` query salah → silent fail
- ✅ Fix #5: SW cache `js/config.js`
- ✅ Fix #6: Password demo ≠ schema (intentional, tidak diubah)
- ✅ Fix #7: `.env` di git history

## Status terakhir
Semua bug sudah diperbaiki. `CHANGELOG_FIXES.md` lengkap entri Fix #1–#7.

## Langkah berikutnya (USER ACTION)
1. **Regenerate service_role key di Supabase Dashboard** (URGENT — Fix #7)
2. Update `SUPABASE_SERVICE_ROLE_KEY` di Vercel dengan key baru
3. Jalankan `schema.sql` di Supabase SQL Editor (kolom baru `is_frozen`/`last_active`)
4. `git push --force` karena history sudah diubah

## Jangan lakukan (jebakan yang sudah ditemukan)
- Jangan push force ke remote sebelum service_role key baru sudah ter-set di Vercel.
- Jangan ubah password schema.sql tanpa konfirmasi user (ini kredensial akun utama).
