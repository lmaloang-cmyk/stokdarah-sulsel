> ⚠️ **SEBELUM DEPLOY — WAJIB DIISI DULU:**
>
> 1. **`js/config.js`** — isi `url` dan `anonKey` dari Supabase (lihat step 4-5 di bawah)
> 2. **`supabase/schema.sql`** — ubah kata sandi default akun utama sebelum dijalankan
>
> Tanpa langkah ini, aplikasi berjalan di mode demo (data tidak tersinkron).
>
---

# Stok Darah Sulsel — Panduan Live (GitHub + Vercel + Supabase)

Aplikasi web informasi stok darah real-time UPT Transfusi Darah Dinkes Prov. Sulawesi Selatan.
Mobile-first, animasi halus, PWA (bisa di-install di HP), login petugas tersembunyi
di balik **logo Sulsel**, dan data tersinkron ke semua HP via Supabase.

## Isi Paket

```
├── index.html            # Halaman utama (mobile-first)
├── style.css             # Tampilan + animasi
├── app.js                # Logika aplikasi + koneksi Supabase
├── js/config.js          # ⚙️ ISI INI: URL & anon key Supabase
├── manifest.json, sw.js  # PWA (bisa di-install di HP)
├── vercel.json           # Konfigurasi hosting Vercel
├── assets/
│   ├── logo-sulsel.png   # Logo + trigger login petugas
│   └── og-thumbnail.png  # Thumbnail share WA/FB (1200×630)
└── supabase/schema.sql   # 🗄️ Database + akun utama + fungsi panel
```

---

## 1. Supabase (database + login)

1. Buat akun di https://supabase.com → **New project** (gratis).
2. Buka **SQL Editor → New query**, tempel seluruh isi `supabase/schema.sql`.
3. **PENTING:** sebelum klik *Run*, ganti baris kata sandi akun utama:
   ```sql
   v_password text := 'SulselDarah#2026';   -- ← GANTI dengan kata sandi rahasia Anda
   ```
   Lalu **Run**. Ini membuat: tabel stok, tabel info, pengaturan no. WA, peran petugas,
   akun utama `cecemeri48@gmail.com`, fungsi tambah/hapus petugas, dan realtime.
4. Buka **Project Settings → API Keys**, salin **Project URL** dan key dari tabel
   **Publishable key** (nilainya diawali `sb_publishable_`).
   ⚠️ Tabel **Secret keys** (`sb_secret_...`) JANGAN dipakai di sini — itu khusus server.
   Kedua tabel sama-sama punya baris bernama `default`, jadi patokannya adalah
   **awalan nilainya**, bukan namanya.
5. Tempel keduanya ke `js/config.js`:
   ```js
   window.SUPABASE_CONFIG = {
     url: "https://xxxx.supabase.co",
     anonKey: "sb_publishable_xxxxxxxxxxxxxxxxxxxx"
   };
   ```
   Perhatikan kutip penutup pada `anonKey` dan `};` di baris tersendiri. Satu kutip
   yang hilang membuat seluruh file gagal dibaca browser, dan aplikasi diam-diam
   jatuh ke **mode demo** (data hanya tersimpan di perangkat itu, tidak ke server).
6. (Disarankan) **Authentication → Sign In / Providers → Email** → matikan **Confirm email**,
   supaya petugas baru bisa langsung login tanpa verifikasi email.

> Keamanan: email & peran akun utama **tidak pernah ditampilkan** di mana pun pada
> tampilan aplikasi. Panel hanya muncul setelah login, dan daftar petugas tidak
> menyertakan akun utama. Publik hanya bisa membaca data; perubahan data hanya
> bisa dilakukan petugas yang login (dijaga Row Level Security).

## 2. GitHub (simpan kode)

```bash
git init
git add .
git commit -m "Stok Darah Sulsel — live"
git branch -M main
git remote add origin https://github.com/USERNAME/stok-darah-sulsel.git
git push -u origin main
```

## 3. Vercel (hosting live)

1. Login https://vercel.com pakai akun GitHub.
2. **Add New → Project → Import** repo `stok-darah-sulsel`.
3. Framework: **Other** (tanpa proses build). Klik **Deploy**.
4. Selesai — Anda mendapat URL seperti `https://stok-darah-sulsel.vercel.app`.
5. Buka URL itu di HP → data stok tampil live dan realtime.

### Setelah dapat domain Vercel
Agar thumbnail muncul saat link dishare ke WA/FB, ganti domain pada tag
`og:image` dan `twitter:image` di `index.html` dengan domain asli Anda, lalu `git push`.

---

## Cara Pakai Harian

| Aksi | Cara |
|---|---|
| **Login petugas** | Ketuk **logo Sulsel** di pojok kiri atas |
| **Input stok darah** | Login → tab **Stok** → isi jumlah per golongan → Simpan |
| **Ganti no. WA / alamat** | Login → tab **Info & WA** → simpan |
| **Tambah info/pengumuman** | Login → tab **Info & WA** → Terbitkan Info |
| **Tambah/hapus petugas input** | Login dengan akun utama → tab **Kelola Petugas** |

Semua perubahan langsung muncul di HP semua pengunjung **tanpa refresh** (realtime).

## Mode Demo

Selama `js/config.js` belum diisi, aplikasi berjalan dalam mode demo (data tersimpan
lokal di HP) — cocok untuk preview tampilan sebelum Supabase siap.
Login demo: email `cecemeri48@gmail.com`, kata sandi `admin123`.
