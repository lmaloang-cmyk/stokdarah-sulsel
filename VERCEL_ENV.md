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
| **Value** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6c25tZ2hja2h3ZWx0c2VkZ3FmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjMzODI2MiwiZXhwIjoyMTAxOTE0MjYyfQ.mToiXehxV3n3YIZzFLifGHMPwfXgYJxwrjzCHYscvyI` |
| **Environment** | Production, Preview, Development (centang semua) |

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
