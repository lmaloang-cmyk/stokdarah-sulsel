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

  let totalFrozen = 0
  const results = { announcements: 0, requests: 0, events: 0 }

  // Helper: freeze a table
  async function freezeTable(tableName) {
    try {
      // First check if columns exist, add if not
      const { error: addColErr } = await supabase.rpc('add_freeze_columns')
      if (addColErr) console.log('[freeze] add_freeze_columns:', addColErr.message)

      // Update last_active
      const { error: updateErr } = await supabase.rpc('update_last_active')
      if (updateErr) console.log('[freeze] update_last_active:', updateErr.message)

      // Freeze records
      const { data, error } = await supabase
        .from(tableName)
        .update({ is_frozen: true })
        .or(`last_active.is.null,last_active.lt.${sevenDaysAgo}`)
        .eq('is_frozen', false)
        .select('count')

      if (error) {
        console.error(`[freeze] ${tableName} error:`, error.message)
        return 0
      }

      return data?.[0]?.count || 0
    } catch (e) {
      console.error(`[freeze] ${tableName} exception:`, e.message)
      return 0
    }
  }

  // 1. Freeze announcements
  results.announcements = await freezeTable('announcements')
  totalFrozen += results.announcements

  // 2. Freeze blood_requests
  results.requests = await freezeTable('blood_requests')
  totalFrozen += results.requests

  // 3. Freeze donor_events
  results.events = await freezeTable('donor_events')
  totalFrozen += results.events

  return res.json({
    success: true,
    frozen: totalFrozen,
    ...results
  })
}
