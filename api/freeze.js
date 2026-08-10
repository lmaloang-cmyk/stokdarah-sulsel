// Vercel Serverless Function — /api/freeze
// Freeze records inactive for 7+ days
// NO RPC, NO .or() - Simple direct queries only

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

  // Helper: freeze records in a table
  async function freezeTable(tableName) {
    try {
      let count = 0

      // Query 1: Records where last_active is null and is_frozen is false
      const { data: d1, error: e1 } = await supabase
        .from(tableName)
        .update({ is_frozen: true })
        .is('is_frozen', false)
        .is('last_active', null)
        .select('count')

      if (e1) {
        console.log(`[freeze] ${tableName} q1:`, e1.message)
        return 0
      }
      count += d1?.[0]?.count || 0

      // Query 2: Records where last_active < 7 days ago
      const { data: d2, error: e2 } = await supabase
        .from(tableName)
        .update({ is_frozen: true })
        .lt('last_active', sevenDaysAgo)
        .eq('is_frozen', false)
        .select('count')

      if (e2) {
        console.error(`[freeze] ${tableName} q2:`, e2.message)
        return count
      }
      count += d2?.[0]?.count || 0

      console.log(`[freeze] ${tableName}: ${count} frozen`)
      return count
    } catch (e) {
      console.error(`[freeze] ${tableName}:`, e.message)
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
