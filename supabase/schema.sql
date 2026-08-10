-- ============================================================================
-- STOK DARAH SULSEL — SKEMA DATABASE SUPABASE
-- Jalankan file ini SEKALI di: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ----------------------------------------------------------------------------
-- 1. TABEL PERAN PETUGAS (admin / pemilik akun utama)
-- ----------------------------------------------------------------------------
create table if not exists public.user_roles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null unique,
  role       text not null default 'admin' check (role in ('superadmin','admin')),
  created_at timestamptz not null default now()
);
alter table public.user_roles enable row level security;

-- ----------------------------------------------------------------------------
-- 2. TABEL STOK DARAH
-- ----------------------------------------------------------------------------
create table if not exists public.blood_stock (
  golongan   text primary key check (golongan in ('A','B','O','AB')),
  wb         int  not null default 0 check (wb  >= 0),
  prc        int  not null default 0 check (prc >= 0),
  tc         int  not null default 0 check (tc  >= 0),
  ffp        int  not null default 0 check (ffp >= 0),
  status     text not null default 'Aman' check (status in ('Melimpah','Aman','Waspada','Terbatas')),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.blood_stock enable row level security;

insert into public.blood_stock (golongan, wb, prc, tc, ffp, status) values
  ('A',  0, 0, 17, 47, 'Aman'),
  ('B',  0, 0,  0, 53, 'Waspada'),
  ('O',  0, 0, 27, 67, 'Melimpah'),
  ('AB', 0, 0, 14, 34, 'Terbatas')
on conflict (golongan) do nothing;

-- ----------------------------------------------------------------------------
-- 3. TABEL INFO / PENGUMUMAN (dikelola petugas, tampil di halaman publik)
-- ----------------------------------------------------------------------------
create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null,
  tag        text not null default 'Info',
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
alter table public.announcements enable row level security;

insert into public.announcements (title, body, tag) values
  ('Jadwal Donor Gedung UPTD', 'Senin–Minggu, pukul 08.00–20.00 WITA. Lokasi: Jl. Perintis Kemerdekaan KM 11, Tamalanrea, Makassar (samping kampus UNHAS).', 'Jadwal'),
  ('Syarat Donor Darah', 'Usia 17–60 tahun, berat badan minimal 45 kg, tekanan darah normal, Hb minimal 12,5 g/dL, jarak donor terakhir minimal 2 bulan.', 'Info')
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- 4. TABEL PENGATURAN (nomor WA hotline & alamat)
-- ----------------------------------------------------------------------------
create table if not exists public.settings (
  key   text primary key,
  value text not null
);
alter table public.settings enable row level security;

insert into public.settings (key, value) values
  ('hotline1', '0823-9421-6046'),
  ('hotline2', '0898-4693-026'),
  ('location_text', 'JL. PERINTIS KEMERDEKAAN KM 11, KEC. TAMALANREA, KOTA MAKASSAR')
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- 5. FUNGSI BANTU PERAN
-- ----------------------------------------------------------------------------
create or replace function public.current_role()
returns text
language sql stable security definer
set search_path = public
as $$
  select role from public.user_roles where user_id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(public.current_role() in ('admin','superadmin'), false);
$$;

-- ----------------------------------------------------------------------------
-- 6. KEBIJAKAN KEAMANAN (ROW LEVEL SECURITY)
--    Publik: hanya BACA. Petugas login: boleh ubah stok, info, dan pengaturan.
-- ----------------------------------------------------------------------------
drop policy if exists "public read stok"    on public.blood_stock;
drop policy if exists "petugas update stok" on public.blood_stock;
create policy "public read stok"    on public.blood_stock for select using (true);
create policy "petugas update stok" on public.blood_stock for update
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read info aktif" on public.announcements;
drop policy if exists "petugas insert info"    on public.announcements;
drop policy if exists "petugas update info"    on public.announcements;
drop policy if exists "petugas delete info"    on public.announcements;
create policy "public read info aktif" on public.announcements for select
  using (is_active = true or public.is_admin());
create policy "petugas insert info" on public.announcements for insert
  with check (public.is_admin());
create policy "petugas update info" on public.announcements for update
  using (public.is_admin()) with check (public.is_admin());
create policy "petugas delete info" on public.announcements for delete
  using (public.is_admin());

drop policy if exists "public read settings"    on public.settings;
drop policy if exists "petugas update settings" on public.settings;
create policy "public read settings"    on public.settings for select using (true);
create policy "petugas update settings" on public.settings for update
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "baca peran sendiri" on public.user_roles;
create policy "baca peran sendiri" on public.user_roles for select
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 7. AKUN UTAMA (cecemeri48@gmail.com)
--    ⚠ GANTI kata sandi di bawah SEBELUM menjalankan, lalu rahasiakan.
--    Akun ini tidak pernah ditampilkan di mana pun pada tampilan aplikasi.
-- ----------------------------------------------------------------------------
do $$
declare
  v_uid      uuid := gen_random_uuid();
  v_email    text := 'cecemeri48@gmail.com';
  v_password text := 'Akusaja1.';  -- ⚠️ GANTI sebelum menjalankan schema ini
begin
  if not exists (select 1 from auth.users where email = v_email) then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data
    ) values (
      '00000000-0000-0000-0000-000000000000', v_uid,
      'authenticated', 'authenticated', v_email,
      extensions.crypt(v_password, extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb
    );
    insert into auth.identities (user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      v_uid, v_uid::text,
      jsonb_build_object('sub', v_uid::text, 'email', v_email),
      'email', now(), now(), now()
    );
  else
    select id into v_uid from auth.users where email = v_email;
  end if;

  insert into public.user_roles (user_id, email, role)
  values (v_uid, v_email, 'superadmin')
  on conflict (user_id) do update set role = 'superadmin';
end $$;

-- ----------------------------------------------------------------------------
-- 8. FUNGSI PANEL: KELOLA ADMIN INPUTTER (hanya akun utama)
-- ----------------------------------------------------------------------------

-- Tambah admin inputter baru (email + kata sandi)
create or replace function public.create_admin_user(p_email text, p_password text, p_name text default null)
returns json
language plpgsql security definer
set search_path = public, auth, extensions
as $$
declare
  v_uid   uuid;
  v_email text := lower(trim(p_email));
begin
  if public.current_role() <> 'superadmin' then
    return json_build_object('ok', false, 'error', 'Hanya akun utama yang dapat menambah petugas.');
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return json_build_object('ok', false, 'error', 'Format email tidak valid.');
  end if;
  if length(coalesce(p_password,'')) < 6 then
    return json_build_object('ok', false, 'error', 'Kata sandi minimal 6 karakter.');
  end if;
  if exists (select 1 from auth.users where email = v_email) then
    return json_build_object('ok', false, 'error', 'Email tersebut sudah terdaftar.');
  end if;

  v_uid := gen_random_uuid();
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data
  ) values (
    '00000000-0000-0000-0000-000000000000', v_uid,
    'authenticated', 'authenticated', v_email,
    crypt(p_password, gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', coalesce(p_name, ''))
  );
  insert into auth.identities (user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (
    v_uid, v_uid::text,
    jsonb_build_object('sub', v_uid::text, 'email', v_email),
    'email', now(), now(), now()
  );
  insert into public.user_roles (user_id, email, role) values (v_uid, v_email, 'admin');

  return json_build_object('ok', true, 'user_id', v_uid);
exception when others then
  return json_build_object('ok', false, 'error', 'Gagal membuat akun: ' || sqlerrm);
end $$;

-- Daftar admin inputter (akun utama TIDAK ikut ditampilkan)
create or replace function public.list_admins()
returns table(user_id uuid, email text, created_at timestamptz)
language sql stable security definer
set search_path = public
as $$
  select ur.user_id, ur.email, ur.created_at
  from public.user_roles ur
  where ur.role = 'admin' and public.current_role() = 'superadmin'
  order by ur.created_at desc;
$$;

-- Hapus admin inputter
create or replace function public.delete_admin_user(p_user_id uuid)
returns json
language plpgsql security definer
set search_path = public, auth
as $$
begin
  if public.current_role() <> 'superadmin' then
    return json_build_object('ok', false, 'error', 'Hanya akun utama yang dapat menghapus petugas.');
  end if;
  if p_user_id = auth.uid() then
    return json_build_object('ok', false, 'error', 'Tidak dapat menghapus akun sendiri.');
  end if;
  if not exists (select 1 from public.user_roles where user_id = p_user_id and role = 'admin') then
    return json_build_object('ok', false, 'error', 'Petugas tidak ditemukan.');
  end if;
  delete from auth.users where id = p_user_id;  -- ikut menghapus baris user_roles (cascade)
  return json_build_object('ok', true);
exception when others then
  return json_build_object('ok', false, 'error', sqlerrm);
end $$;

revoke all on function public.create_admin_user(text, text, text) from anon;
revoke all on function public.list_admins()                        from anon;
revoke all on function public.delete_admin_user(uuid)              from anon;
grant execute on function public.create_admin_user(text, text, text) to authenticated;
grant execute on function public.list_admins()                        to authenticated;
grant execute on function public.delete_admin_user(uuid)              to authenticated;

-- ----------------------------------------------------------------------------
-- 9. TABEL PERMINTAAN DARAH MASUK (form darurat tersimpan untuk petugas)
-- ----------------------------------------------------------------------------
create table if not exists public.blood_requests (
  id           uuid primary key default gen_random_uuid(),
  patient_name text not null,
  hospital     text not null,
  golongan     text not null,
  komponen     text not null,
  jumlah       int  not null default 1,
  phone        text not null,
  created_at   timestamptz not null default now()
);
alter table public.blood_requests enable row level security;

drop policy if exists "siapa pun boleh kirim permintaan" on public.blood_requests;
drop policy if exists "petugas baca permintaan"          on public.blood_requests;
drop policy if exists "petugas hapus permintaan"         on public.blood_requests;
create policy "siapa pun boleh kirim permintaan" on public.blood_requests for insert with check (true);
create policy "petugas baca permintaan"          on public.blood_requests for select using (public.is_admin());
create policy "petugas hapus permintaan"         on public.blood_requests for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 10. TABEL JADWAL DONOR KELILING
-- ----------------------------------------------------------------------------
create table if not exists public.donor_events (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  location   text not null,
  event_date date not null,
  start_time text,
  end_time   text,
  note       text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.donor_events enable row level security;

drop policy if exists "public baca jadwal"    on public.donor_events;
drop policy if exists "petugas insert jadwal" on public.donor_events;
drop policy if exists "petugas update jadwal" on public.donor_events;
drop policy if exists "petugas delete jadwal" on public.donor_events;
create policy "public baca jadwal"    on public.donor_events for select using (is_active = true or public.is_admin());
create policy "petugas insert jadwal" on public.donor_events for insert with check (public.is_admin());
create policy "petugas update jadwal" on public.donor_events for update using (public.is_admin()) with check (public.is_admin());
create policy "petugas delete jadwal" on public.donor_events for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 11. TABEL RIWAYAT STOK (untuk grafik tren 7 hari)
-- ----------------------------------------------------------------------------
create table if not exists public.stock_history (
  id          bigint generated always as identity primary key,
  golongan    text not null,
  total       int  not null,
  recorded_at timestamptz not null default now()
);
alter table public.stock_history enable row level security;

drop policy if exists "public baca riwayat"    on public.stock_history;
drop policy if exists "petugas catat riwayat"  on public.stock_history;
create policy "public baca riwayat"   on public.stock_history for select using (true);
create policy "petugas catat riwayat" on public.stock_history for insert with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 12. REALTIME (perubahan langsung muncul di semua HP tanpa refresh)
-- ----------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.blood_stock;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.announcements;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.settings;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.blood_requests;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.donor_events;
exception when duplicate_object then null;
end $$;

-- ============================================================================
-- SELESAI. Langkah berikutnya ada di README.md (bagian "2. Supabase").
-- ============================================================================
