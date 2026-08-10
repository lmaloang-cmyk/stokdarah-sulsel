// Vercel Serverless Function — /api/freeze
// Freeze records inactive for 7+ days

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
  let annCount = 0
  try {
    const { data: annData, error: annErr } = await supabase
      .from('announcements')
      .update({ is_frozen: true })
      .lte('last_active', sevenDaysAgo)
      .eq('is_frozen', false)
      .select('id, title')

    if (annErr) throw annErr
    annCount = annData?.length || 0
    console.log(`[freeze] announcements: ${annCount} frozen`)
  } catch (e) {
    console.error('[freeze] announcements error:', e.message)
  }

  // 2. Freeze blood_requests
  let reqCount = 0
  try {
    const { data: reqData, error: reqErr } = await supabase
      .from('blood_requests')
      .update({ is_frozen: true })
      .lte('last_active', sevenDaysAgo)
      .eq('is_frozen', false)
      .select('id, patient_name')

    if (reqErr) throw reqErr
    reqCount = reqData?.length || 0
    console.log(`[freeze] blood_requests: ${reqCount} frozen`)
  } catch (e) {
    console.error('[freeze] blood_requests error:', e.message)
  }

  // 3. Freeze donor_events
  let evtCount = 0
  try {
    const { data: evtData, error: evtErr } = await supabase
      .from('donor_events')
      .update({ is_frozen: true })
      .lte('last_active', sevenDaysAgo)
      .eq('is_frozen', false)
      .select('id, title')

    if (evtErr) throw evtErr
    evtCount = evtData?.length || 0
    console.log(`[freeze] donor_events: ${evtCount} frozen`)
  } catch (e) {
    console.error('[freeze] donor_events error:', e.message)
  }

  const total = annCount + reqCount + evtCount

  return res.json({
    success: true,
    frozen: total,
    announcements: annCount,
    requests: reqCount,
    events: evtCount
  })
}
