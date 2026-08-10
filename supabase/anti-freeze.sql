-- ========================================
-- ANTI-BEKU: Record Inaktif > 7 Hari
-- Run DI SUPABASE SQL EDITOR SEKALI SAJA
-- ========================================

-- 1. Tambah kolom last_active & is_frozen ke semua tabel
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT FALSE;

ALTER TABLE blood_requests
  ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT FALSE;

ALTER TABLE donor_events
  ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT FALSE;

-- 2. Isi last_active dari created_at (sekali saja saat setup)
UPDATE announcements SET last_active = created_at WHERE last_active IS NULL;
UPDATE blood_requests SET last_active = created_at WHERE last_active IS NULL;
UPDATE donor_events SET last_active = created_at WHERE last_active IS NULL;

-- 3. Fungsi Freeze (opsional, untuk dipanggil manual)
CREATE OR REPLACE FUNCTION freeze_announcements(days INTEGER DEFAULT 7)
RETURNS TABLE (item_id UUID, title TEXT, days_inactive INTERVAL) AS $$
BEGIN
  RETURN QUERY
  UPDATE announcements
  SET is_frozen = TRUE
  WHERE COALESCE(last_active, created_at) < NOW() - (days || ' days')::INTERVAL
    AND is_frozen = FALSE
  RETURNING announcements.id, announcements.title, NOW() - COALESCE(last_active, created_at);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION freeze_blood_requests(days INTEGER DEFAULT 7)
RETURNS TABLE (item_id UUID, patient_name TEXT, golongan TEXT, days_inactive INTERVAL) AS $$
BEGIN
  RETURN QUERY
  UPDATE blood_requests
  SET is_frozen = TRUE
  WHERE COALESCE(last_active, created_at) < NOW() - (days || ' days')::INTERVAL
    AND is_frozen = FALSE
  RETURNING blood_requests.id, blood_requests.patient_name, blood_requests.golongan, NOW() - COALESCE(last_active, created_at);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION freeze_donor_events(days INTEGER DEFAULT 7)
RETURNS TABLE (item_id UUID, title TEXT, days_inactive INTERVAL) AS $$
BEGIN
  RETURN QUERY
  UPDATE donor_events
  SET is_frozen = TRUE
  WHERE COALESCE(last_active, created_at) < NOW() - (days || ' days')::INTERVAL
    AND is_frozen = FALSE
  RETURNING donor_events.id, donor_events.title, NOW() - COALESCE(last_active, created_at);
END;
$$ LANGUAGE plpgsql;

-- 4. Fungsi Thaw (buka beku)
CREATE OR REPLACE FUNCTION thaw_announcement(p_id UUID)
RETURNS TABLE (item_id UUID, is_frozen BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  UPDATE announcements SET is_frozen = FALSE WHERE id = p_id AND is_frozen = TRUE RETURNING id, is_frozen;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION thaw_blood_request(p_id UUID)
RETURNS TABLE (item_id UUID, is_frozen BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  UPDATE blood_requests SET is_frozen = FALSE WHERE id = p_id AND is_frozen = TRUE RETURNING id, is_frozen;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION thaw_donor_event(p_id UUID)
RETURNS TABLE (item_id UUID, is_frozen BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  UPDATE donor_events SET is_frozen = FALSE WHERE id = p_id AND is_frozen = TRUE RETURNING id, is_frozen;
END;
$$ LANGUAGE plpgsql;

-- 5. Test — jalankan freeze
SELECT 'announcements' AS tbl, * FROM freeze_announcements(7);
SELECT 'blood_requests' AS tbl, * FROM freeze_blood_requests(7);
SELECT 'donor_events' AS tbl, * FROM freeze_donor_events(7);

-- 6. Cek hasil
SELECT 'announcements' AS tbl, id, title, is_frozen, last_active FROM announcements WHERE is_frozen = TRUE
UNION ALL
SELECT 'blood_requests', id, patient_name, is_frozen, last_active FROM blood_requests WHERE is_frozen = TRUE
UNION ALL
SELECT 'donor_events', id, title, is_frozen, last_active FROM donor_events WHERE is_frozen = TRUE;
