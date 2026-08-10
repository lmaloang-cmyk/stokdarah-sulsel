-- ========================================
-- ANTI-BEKU: Record Inaktif > 7 Hari
-- Run DI SUPABASE SQL EDITOR SEKALI SAJA
-- ========================================

-- 1. Create functions first
CREATE OR REPLACE FUNCTION add_freeze_columns()
RETURNS void AS $$
BEGIN
  -- announcements
  ALTER TABLE announcements ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE;
  ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT FALSE;

  -- blood_requests
  ALTER TABLE blood_requests ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE;
  ALTER TABLE blood_requests ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT FALSE;

  -- donor_events
  ALTER TABLE donor_events ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE;
  ALTER TABLE donor_events ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT FALSE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_last_active()
RETURNS void AS $$
BEGIN
  UPDATE announcements SET last_active = created_at WHERE last_active IS NULL;
  UPDATE blood_requests SET last_active = created_at WHERE last_active IS NULL;
  UPDATE donor_events SET last_active = created_at WHERE last_active IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Call functions
SELECT add_freeze_columns();
SELECT update_last_active();

-- 3. Disable RLS
ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE blood_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE donor_events DISABLE ROW LEVEL SECURITY;

-- 4. Freeze records older than 7 days
UPDATE announcements SET is_frozen = TRUE WHERE COALESCE(last_active, created_at) < NOW() - INTERVAL '7 days' AND is_frozen = FALSE;
UPDATE blood_requests SET is_frozen = TRUE WHERE COALESCE(last_active, created_at) < NOW() - INTERVAL '7 days' AND is_frozen = FALSE;
UPDATE donor_events SET is_frozen = TRUE WHERE COALESCE(last_active, created_at) < NOW() - INTERVAL '7 days' AND is_frozen = FALSE;

-- 5. Check results
SELECT 'announcements' AS tbl, COUNT(*) AS frozen FROM announcements WHERE is_frozen = TRUE
UNION ALL
SELECT 'blood_requests', COUNT(*) FROM blood_requests WHERE is_frozen = TRUE
UNION ALL
SELECT 'donor_events', COUNT(*) FROM donor_events WHERE is_frozen = TRUE;
