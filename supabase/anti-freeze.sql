-- ========================================
-- ANTI-BEKU: Setup Database
-- Run DI SUPABASE SQL EDITOR SEKALI SAJA
-- ========================================

-- 1. Disable RLS
ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE blood_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE donor_events DISABLE ROW LEVEL SECURITY;

-- 2. Add columns
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT FALSE;

ALTER TABLE blood_requests ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE;
ALTER TABLE blood_requests ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT FALSE;

ALTER TABLE donor_events ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE;
ALTER TABLE donor_events ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT FALSE;

-- 3. Update last_active from created_at
UPDATE announcements SET last_active = created_at WHERE last_active IS NULL;
UPDATE blood_requests SET last_active = created_at WHERE last_active IS NULL;
UPDATE donor_events SET last_active = created_at WHERE last_active IS NULL;

-- 4. Freeze records older than 7 days
UPDATE announcements SET is_frozen = TRUE
WHERE (last_active IS NULL OR last_active < NOW() - INTERVAL '7 days')
AND is_frozen = FALSE;

UPDATE blood_requests SET is_frozen = TRUE
WHERE (last_active IS NULL OR last_active < NOW() - INTERVAL '7 days')
AND is_frozen = FALSE;

UPDATE donor_events SET is_frozen = TRUE
WHERE (last_active IS NULL OR last_active < NOW() - INTERVAL '7 days')
AND is_frozen = FALSE;

-- 5. Check results
SELECT 'announcements' AS tbl, COUNT(*) AS frozen FROM announcements WHERE is_frozen = TRUE
UNION ALL
SELECT 'blood_requests', COUNT(*) FROM blood_requests WHERE is_frozen = TRUE
UNION ALL
SELECT 'donor_events', COUNT(*) FROM donor_events WHERE is_frozen = TRUE;
