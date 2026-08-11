-- ========================================
-- ANTI-BEKU: Migration Tambahan
-- Jalankan SEKALI di: Supabase SQL Editor
-- Hanya ditambahkan kolom yang belum ada.
-- ========================================

-- 1. Tambah kolom jika belum ada
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT FALSE;

ALTER TABLE blood_requests ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE;
ALTER TABLE blood_requests ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT FALSE;

ALTER TABLE donor_events ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE;
ALTER TABLE donor_events ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT FALSE;

-- 2. Isi last_active dari created_at untuk data lama
UPDATE announcements SET last_active = created_at WHERE last_active IS NULL;
UPDATE blood_requests SET last_active = created_at WHERE last_active IS NULL;
UPDATE donor_events SET last_active = created_at WHERE last_active IS NULL;

-- 3. Cek hasil
SELECT 'announcements' AS tbl, COUNT(*) AS frozen FROM announcements WHERE is_frozen = TRUE
UNION ALL
SELECT 'blood_requests', COUNT(*) FROM blood_requests WHERE is_frozen = TRUE
UNION ALL
SELECT 'donor_events', COUNT(*) FROM donor_events WHERE is_frozen = TRUE;
