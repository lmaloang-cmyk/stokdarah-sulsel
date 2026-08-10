// Vercel Serverless Function — /api/freeze
// Called by Vercel Cron every day at 2:00 AM UTC

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars:', { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey })
    return res.status(500).json({ error: 'Missing environment variables' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Test connection first
  const { data: test, error: testErr } = await supabase.from('blood_stock').select('count')
  if (testErr) {
    console.error('Supabase connection error:', testErr)
    return res.status(500).json({ error: 'Database connection failed: ' + testErr.message })
  }

  // Now try freeze functions
  const { data: announcements, error: err1 } = await supabase
    .rpc('freeze_announcements', { days: 7 })

  const { data: requests, error: err2 } = await supabase
    .rpc('freeze_blood_requests', { days: 7 })

  const { data: events, error: err3 } = await supabase
    .rpc('freeze_donor_events', { days: 7 })

  const errors = [err1, err2, err3].filter(Boolean)
  if (errors.length > 0) {
    console.error('Freeze errors:', errors)
    return res.status(500).json({ error: errors.map(e => e.message) })
  }

  const totalFrozen = (announcements?.length || 0) + (requests?.length || 0) + (events?.length || 0)

  console.log(`[Cron] Frozen: ${announcements?.length || 0} announcements, ${requests?.length || 0} requests, ${events?.length || 0} events`)

  return res.json({
    success: true,
    frozen: totalFrozen,
    announcements: announcements?.length || 0,
    requests: requests?.length || 0,
    events: events?.length || 0
  })
}
