// Vercel Serverless Function — /api/freeze
// Direct database query, no RPC functions needed

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Missing environment variables' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // 1. Freeze announcements
  const { data: annUpdates, error: annErr } = await supabase
    .from('announcements')
    .update({ is_frozen: true })
    .or(`last_active.lt.${sevenDaysAgo},and(is_frozen.eq.false,last_active.eq.null)`)
    .select('id, title')

  // 2. Freeze blood_requests
  const { data: reqUpdates, error: reqErr } = await supabase
    .from('blood_requests')
    .update({ is_frozen: true })
    .or(`last_active.lt.${sevenDaysAgo},and(is_frozen.eq.false,last_active.eq.null)`)
    .select('id, patient_name')

  // 3. Freeze donor_events
  const { data: evtUpdates, error: evtErr } = await supabase
    .from('donor_events')
    .update({ is_frozen: true })
    .or(`last_active.lt.${sevenDaysAgo},and(is_frozen.eq.false,last_active.eq.null)`)
    .select('id, title')

  const errors = [annErr, reqErr, evtErr].filter(Boolean)
  if (errors.length > 0) {
    console.error('Freeze errors:', errors)
    return res.status(500).json({ error: errors.map(e => e.message) })
  }

  const total = (annUpdates?.length || 0) + (reqUpdates?.length || 0) + (evtUpdates?.length || 0)

  return res.json({
    success: true,
    frozen: total,
    announcements: annUpdates?.length || 0,
    requests: reqUpdates?.length || 0,
    events: evtUpdates?.length || 0
  })
}
