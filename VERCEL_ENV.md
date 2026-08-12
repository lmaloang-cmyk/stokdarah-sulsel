# Environment Variables untuk Vercel

## Langkah:
1. Buka https://vercel.com/dashboard
2. Klik project **stokdarah-sulsel**
3. Klik **Settings** → **Environment Variables**
4. Klik **Add** untuk setiap variable di bawah

---

## Variable 1: SUPABASE URL

| Field | Value |
|-------|-------|
| **Name** | `NEXT_PUBLIC_SUPABASE_URL` |
| **Value** | `https://czsnmghckhweltsedgqf.supabase.co` |
| **Environment** | Production, Preview, Development (centang semua) |

Klik **Save**

---

## Variable 2: SERVICE ROLE KEY

| Field | Value |
|-------|-------|
| **Name** | `SUPABASE_SERVICE_ROLE_KEY` |
| **Value** | `sb_secret_xxxxxxxxxxxxxxxxxxxxxxxx` |
| **Environment** | Production, Preview, Development (centang semua) |

> ⚠️ **Jangan pernah menulis nilai key yang asli di file ini.** File ini ikut
> masuk ke repository dan bisa dibaca siapa pun yang punya akses.
> Ambil nilainya langsung dari Supabase → **API Keys** → **Secret keys** →
> tombol **Copy**, lalu tempel ke Vercel. Jangan disalin ke mana pun selain itu.

> ℹ️ Sejak 2026-08-12, key model lama (JWT `eyJ...` anon & service_role) sudah
> **dinonaktifkan** di project ini. Yang berlaku sekarang hanya:
> - `sb_publishable_...` → dipakai di browser, ditulis di `js/config.js`
> - `sb_secret_...` → dipakai di server saja, hanya sebagai env var di Vercel

Klik **Save**

---

## Setelah Disimpan:
1. Klik **Deployments** di sidebar kiri
2. Klik **Redeploy** pada deployment terbaru
3. Tunggu sampai selesai

---

## Test:
Buka di browser:
```
https://stokdarah-sulsel.vercel.app/api/freeze
```

Harusnya muncul:
```json
{"success":true,"frozen":0,"announcements":0,"requests":0,"events":0}
```
