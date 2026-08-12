# Stok Darah Sulsel - Handoff
Status: **APLIKASI JALAN NORMAL** - Service: stokdarah-sulsel - Diperbarui: 2026-08-12 13:00 WITA

## Arsitektur singkat
- Frontend statis (`index.html` + `app.js` + `style.css`), tanpa framework.
- Data & auth: Supabase project `czsnmghckhweltsedgqf`.
- Hosting: GitHub `Imaloang-cmyk/stokdarah-sulsel` branch `main` -> auto-deploy ke Vercel.
- Serverless: `api/test.js` (health check), `api/freeze.js` (cron harian 02:00), `api/keep-alive.js`.
- Key model: `sb_publishable_` di `js/config.js`, `sb_secret_` hanya env var Vercel.
  Key JWT lama (anon & service_role) SUDAH DINONAKTIFKAN 2026-08-12.

## Sudah diperbaiki
- Fix #1  handleAddEvent end_time = start_time
- Fix #2  js/config.js kosong
- Fix #3  schema.sql belum punya kolom is_frozen/last_active
- Fix #4  api/freeze.js query salah, silent fail
- Fix #5  SW cache js/config.js (TIDAK TUNTAS - lihat Fix #10)
- Fix #6  Password demo != schema (sengaja dibiarkan)
- Fix #7  .env di git history
- Fix #8  Login super admin gagal: kolom token auth.users NULL
- Fix #9  Simpan stok ditolak RLS: policy INSERT belum ada untuk upsert
- Fix #10 Mode demo diam-diam aktif: kutip hilang di config.js + SW cache-first
- Fix #11 NEXT_PUBLIC_SUPABASE_URL berisi key, bukan URL

Detail lengkap ada di `CHANGELOG_FIXES.md`.

## Kondisi terverifikasi 2026-08-12
- Login super admin: OK
- Simpan stok (upsert + RLS): OK
- /js/config.js production: `sb_publishable_...`, tanpa SyntaxError
- /api/test: url_preview berupa https://...supabase.co, key_preview `sb_secret_...`
- /api/freeze: {"success":true,"frozen":0,...}
- Legacy anon & service_role key: sudah disable, situs tetap normal

## Sisa pekerjaan (USER ACTION)
1. Revoke secret key lama `sb_secret_u23j1...` di Supabase (sempat tampil di screenshot).
2. Hapus publishable key salah nama `service_role_2026`.
3. `git pull --rebase origin main` LALU `git push --force origin main`
   (rebase dulu, karena ada commit yang dibuat lewat web GitHub).
4. Ganti sandi akun utama lewat panel aplikasi - sandi lama sudah beredar di riwayat chat.
5. Tes tambah admin inputter dari panel -> logout -> login pakai akun itu,
   untuk membuktikan `create_admin_user()` hasil Fix #8 benar-benar jalan.
6. Buka situs dari HP untuk memastikan service worker v6 sudah menggantikan v5.

## Jangan lakukan (jebakan yang sudah terbukti)
- Jangan taruh key `sb_secret_` di `js/config.js`. File itu dikirim ke browser.
  Patokan benar/salah adalah AWALAN nilainya, bukan nama barisnya. Baris bernama
  `default` ada di kedua tabel (Publishable dan Secret).
- Jangan commit `js/config.js` tanpa menjalankan `node --check js/config.js` dulu.
  Satu kutip hilang -> seluruh file gagal di-parse -> aplikasi jatuh ke mode demo
  dan semua perubahan cuma masuk localStorage.
- Jangan percaya `success:true` dari /api/test saja. Cek juga BENTUK nilainya:
  url harus diawali https://, key harus diawali sb_secret_.
- Jangan INSERT manual ke `auth.users` tanpa mengisi 8 kolom token
  (confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token,
  reauthentication_token). NULL di situ = error 500 "Database error querying schema".
- Setiap tabel yang dipakai `.upsert()` butuh policy INSERT DAN UPDATE.
- Jangan pakai incognito untuk pekerjaan sungguhan: localStorage-nya dibuang saat
  ditutup, dan pemblokir skrip di sana sering menggagalkan CDN supabase-js.
- Jangan aktifkan kembali legacy JWT key kecuali darurat.
- Jangan jalankan ulang `schema.sql` di database yang sudah berisi data.
  File itu untuk instalasi baru.
