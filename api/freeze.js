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
      // Add columns if not exist
      await supabase.rpc('add_freeze_columns')
      // Update last_active
      await supabase.rpc('update_last_active')

      let count = 0

      // Query: records older than 7 days
      const { data, error } = await supabase
        .from(tableName)
        .update({ is_frozen: true })
        .lt('last_active', sevenDaysAgo)
        .eq('is_frozen', false)
        .select('count')

      if (error) {
        console.error(`[freeze] ${tableName}:`, error.message)
        return 0
      }

      count = data?.[0]?.count || 0
      console.log(`[freeze] ${tableName}: ${count} frozen`)
      return count
    } catch (e) {
      console.error(`[freeze] ${tableName} exception:`, e.message)
      return 0
    }
  }

  // Freeze all tables
  results.announcements = await freezeTable('announcements')
  totalFrozen += results.announcements

  results.requests = await freezeTable('blood_requests')
  totalFrozen += results.requests

  results.events = await freezeTable('donor_events')
  totalFrozen += results.events

  return res.json({
    success: true,
    frozen: totalFrozen,
    ...results
  })
}
