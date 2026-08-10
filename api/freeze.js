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

  // 1. Add columns if not exist
  await supabase.rpc('add_freeze_columns')

  // 2. Update last_active from created_at
  await supabase.rpc('update_last_active')

  // 3. Freeze old records
  let totalFrozen = 0
  const results = { announcements: 0, requests: 0, events: 0 }

  try {
    const { data, error } = await supabase
      .from('announcements')
      .update({ is_frozen: true })
      .lt('last_active', sevenDaysAgo)
      .select('count')

    if (error) throw error
    const count = data?.[0]?.count || 0
    totalFrozen += count
    results.announcements = count
    console.log(`[freeze] announcements: ${count} frozen`)
  } catch (e) {
    console.error('[freeze] announcements error:', e.message)
  }

  try {
    const { data, error } = await supabase
      .from('blood_requests')
      .update({ is_frozen: true })
      .lt('last_active', sevenDaysAgo)
      .select('count')

    if (error) throw error
    const count = data?.[0]?.count || 0
    totalFrozen += count
    results.requests = count
    console.log(`[freeze] blood_requests: ${count} frozen`)
  } catch (e) {
    console.error('[freeze] blood_requests error:', e.message)
  }

  try {
    const { data, error } = await supabase
      .from('donor_events')
      .update({ is_frozen: true })
      .lt('last_active', sevenDaysAgo)
      .select('count')

    if (error) throw error
    const count = data?.[0]?.count || 0
    totalFrozen += count
    results.events = count
    console.log(`[freeze] donor_events: ${count} frozen`)
  } catch (e) {
    console.error('[freeze] donor_events error:', e.message)
  }

  return res.json({
    success: true,
    frozen: totalFrozen,
    ...results
  })
}
