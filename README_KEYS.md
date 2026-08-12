# API Keys Supabase

## Jenis Key (model baru, berlaku sejak 2026-08-12)

| Key | Awalan nilai | Aman di browser? | Dipakai di |
|-----|--------------|------------------|------------|
| **Publishable** | `sb_publishable_` | ✅ Ya — dibatasi RLS | `js/config.js` (frontend) |
| **Secret** | `sb_secret_` | ❌ TIDAK — menembus semua RLS | Env var Vercel `SUPABASE_SERVICE_ROLE_KEY` (server/cron saja) |

> ⚠️ **Jebakan yang pernah terjadi:** kedua tabel di halaman API Keys sama-sama
> punya baris bernama **`default`**. Nama barisnya tidak menentukan apa pun.
> Yang menentukan adalah **awalan nilainya**. Kalau `sb_secret_` sampai masuk ke
> `js/config.js`, seluruh isi database bisa dibaca dan dihapus siapa pun yang
> membuka situs.

## Key model lama (JWT) — SUDAH DINONAKTIFKAN

Key `anon` dan `service_role` berbentuk JWT panjang (`eyJhbGciOi...`) sudah
**di-disable** di project ini. Jangan dipakai lagi, jangan diaktifkan kembali
kecuali darurat. Alasannya: service_role JWT lama sempat ter-commit ke git
history (lihat Fix #7).

## Cara Pakai

### Frontend (`js/config.js`)
1. Supabase Dashboard → **API Keys** → tabel **Publishable key** → **Copy**
2. Tempel ke `js/config.js`:
   ```js
   window.SUPABASE_CONFIG = {
     url: "https://xxxx.supabase.co",
     anonKey: "sb_publishable_xxxxxxxxxxxxxxxxxxxx"
   };
   ```
3. Pastikan kutip penutup dan `};` lengkap, lalu jalankan `node --check js/config.js`.
   Satu kutip yang hilang → file gagal di-parse → aplikasi jatuh ke **mode demo**
   dan semua perubahan hanya masuk `localStorage` (lihat Fix #10).

### Backend (Vercel)
1. Supabase Dashboard → **API Keys** → tabel **Secret keys** → **Copy**
2. Vercel → Settings → Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://xxxx.supabase.co` (URL, **bukan** key)
   - `SUPABASE_SERVICE_ROLE_KEY` = `sb_secret_...`
3. **Redeploy**, lalu cek `/api/test`. Harus muncul:
   - `url_preview` berupa alamat `https://...supabase.co`
   - `key_preview` diawali `sb_secret_`

## ⚠️ PERHATIAN
- **JANGAN** menulis nilai key asli di file mana pun dalam repo ini — termasuk
  README, dokumentasi, maupun komentar kode.
- **JANGAN** menampilkan secret key di screenshot atau layar saat berbagi.
- Kalau bocor: Supabase → API Keys → **Secret keys** → buat key baru → update env
  var di Vercel → Redeploy → baru **revoke** key lama.
