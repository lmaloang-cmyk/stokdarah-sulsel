### Fix #5 — SW cache js/config.js (config lama stuck)
| Tanggal | File | Masalah | Akar | Fix | Verifikasi | Pelajaran | Log Keyword | Deploy |
|---------|------|---------|------|-----|------------|-----------|-------------|--------|
| 2026-08-11 | `sw.js:7` | `js/config.js` di-cache service worker — perubahan config tidak生效 tanpa clear cache manual | `ASSETS_TO_CACHE` mencantumkan `./js/config.js` | Hapus baris `./js/config.js` dari `ASSETS_TO_CACHE` (dikomentari), beri komentar penjelasan | SW tetap valid (cache hanya aset statis) ✓ | File konfigurasi dinamis TIDAK boleh di-cache service worker — selalu gunakan network-first untuk file yang bisa berubah | `service-worker` `cache` `config.js` | PENDING verifikasi |

### Fix #3 — anti-freeze.sql vs schema.sql inkonsisten (kolom is_frozen/last_active tidak ada)
| Tanggal | File | Masalah | Akar | Fix | Verifikasi | Pelajaran | Log Keyword | Deploy |
|---------|------|---------|------|-----|------------|-----------|-------------|--------|
| 2026-08-11 | `supabase/schema.sql` | Tabel `announcements`, `blood_requests`, `donor_events` tidak punya kolom `is_frozen` dan `last_active` yang dibutuhkan `anti-freeze.sql` dan `freeze.js` | Skema lama belum di-update, `anti-freeze.sql` dibuat terpisah | Tambahkan kolom `is_frozen BOOLEAN DEFAULT FALSE` dan `last_active timestamptz` ke ketiga tabel di `schema.sql`, tambahkan `UPDATE ... SET last_active = created_at WHERE last_active IS NULL` untuk setiap tabel | Schema.sql syntax OK ✓; Anti-freeze.sql sekarang hanya melakukan ALTER COLUMN IF NOT EXISTS (aman dijalankan berulang) | Tambahkan kolom migration di schema.sql utama, anti-freeze.sql tetap sebagai fallback aman | `schema.sql` `is_frozen` `last_active` `anti-freeze` | PENDING verifikasi |

### Fix #4 — freeze.js akses kolom tidak ada (cron job silent fail)
| Tanggal | File | Masalah | Akar | Fix | Verifikasi | Pelajaran | Log Keyword | Deploy |
|---------|------|---------|------|-----|------------|-----------|-------------|--------|
| 2026-08-11 | `api/freeze.js` | Query `.update(...).select('count')` tidak valid di Supabase JS — selalu return error yang di-catch silent | Pola query salah: `.update()` tidak support `.select('count')` | Rewrite: gunakan `.select('*', { count: 'exact', head: true })` untuk hitung, lalu `.update()` terpisah dua kali (null check + date check) | `node -c api/freeze.js` ✓; Query logic lebih jelas: count dulu, baru update | Jangan campur `.update()` dengan `.select('count')` di Supabase — gunakan query terpisah | `freeze.js` `count` `update` `cron` | PENDING verifikasi |

### Fix #6 — Password demo ≠ password schema (minor, opsional)
| Tanggal | File | Masalah | Akar | Fix | Verifikasi | Pelajaran | Log Keyword | Deploy |
|---------|------|---------|------|-----|------------|-----------|-------------|--------|
| 2026-08-11 | `app.js:49` | Password demo `admin123` berbeda dengan schema.sql `Akusaja1.` — membingungkan developer | Demo mode & prod schema dibuat terpisah tanpa sinkronisasi | Tidak diubah — demo dan prod memang terpisah. Demo tetap `admin123`, schema tetap `Akusaja1.` | — | Mode demo dan production menggunakan kredensial terpisah — jangan dibuat sama | `demo` `password` `admin123` | SKIP (intentional) |

### Fix #7 — Hapus .env dari git history + servis role key perlu di-regenerate
| Tanggal | File | Masalah | Akar | Fix | Verifikasi | Pelajaran | Log Keyword | Deploy |
|---------|------|---------|------|-----|------------|-----------|-------------|--------|
| 2026-08-11 | `.env` (history) | Service role key terekspos di commit `d76491a` yang sudah pernah di-push ke remote | `.env` berisi secret masuk repo meski sudah di `.gitignore` — tapi history lama masih menyimpannya | `git filter-branch` hapus `.env` dari semua commit, hapus `refs/original/` backup refs, `git reflog expire`, `git gc --prune=now --aggressive` | `git log --all -- .env` kosong ✓; `git cat-file -t d76491a` → `fatal: could not get object info` ✓; hanya `.env.example` tersisa ✓ | `.gitignore` saja tidak cukup jika file sudah pernah di-commit — harus rewrite history + force push | `git-filter-branch` `.env` `service_role_key` `regenerate` | ⚠️ SERVICE ROLE KEY WAJIB DI-REGENERATE di Supabase Dashboard sebelum force push |

### Fix #1 — handleAddEvent end_time = start_time (salah ambil nilai input)
| Tanggal | File | Masalah | Akar | Fix | Verifikasi | Pelajaran | Log Keyword | Deploy |
|---------|------|---------|------|-----|------------|-----------|-------------|--------|
| 2026-08-11 | `app.js:928` | `end_time` sama dengan `start_time` karena keduanya mengambil dari `$('#inputEventTime').value.trim()` yang sama | Field input jam donor cuma satu, tapi kode menyalin nilai yang sama ke dua kolom | Parse input dengan regex `^([^-]+)\s*[-–—]\s*(.+)$` untuk mengambil bagian sebelum dan sesudah pemisah (`-`/`–`/`—`) sebagai `start_time` dan `end_time` terpisah | Syntax check `node -c app.js` ✓; test parsing: `"09.00 - 13.00 WITA"` → end_time `"13.00 WITA"` ✓; input kosong/null tetap `null` ✓ | Selalu periksa apakah satu input field dipakai untuk dua field berbeda — jangan copy paste value tanpa parsing | `handleAddEvent` `end_time` `start_time` `inputEventTime` | PENDING verifikasi |
