# API Keys Supabase

## Jenis Key

| Key | Keterangan | Untuk |
|-----|-----------|--------|
| **anon** (public) | Aman dipakai di browser/client | Frontend React |
| **service_role** (secret) | Bypass RLS, akses penuh ke semua data | Backend API / Cron |

## Contoh Key

```
anon:       eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Cara Pakai di Vercel

1. Buka Supabase Dashboard → Settings → API
2. Scroll ke **"Legacy anon, service_role API keys"**
3. Klik **"Reveal"** pada baris **service_role**
4. Copy kuncinya
5. Buka Vercel → Settings → Environment Variables
6. Tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://czsnmghckhweltsedgqf.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = [paste service_role key]
7. Klik **Save** → **Deploy**

## ⚠️ PERHATIAN
- **JANGAN** bagikan service_role key secara publik
- Jika bocor, segera **regenerate** di Supabase
