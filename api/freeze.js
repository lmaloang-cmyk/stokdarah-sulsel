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

  // Helper: freeze records in a table
  async function freezeTable(tableName) {
    try {
      // Query 1: Count records where last_active is null and is_frozen is false
      const { count: count1, error: err1 } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .is('is_frozen', false)
        .is('last_active', null)

      if (err1) {
        console.log(`[freeze] ${tableName} columns not ready:`, err1.message)
        return 0
      }

      // Query 2: Count records where last_active is older than 7 days
      const { count: count2, error: err2 } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .lt('last_active', sevenDaysAgo)
        .eq('is_frozen', false)

      if (err2) {
        console.error(`[freeze] ${tableName} query2 error:`, err2.message)
        return 0
      }

      const count = (count1 || 0) + (count2 || 0)
      console.log(`[freeze] ${tableName}: ${count} records to freeze`)

      // Now actually update
      const { error: updateErr } = await supabase
        .from(tableName)
        .update({ is_frozen: true })
        .or(`last_active.is.null,and(last_active.lt.${sevenDaysAgo},is_frozen.eq.false)`)

      if (updateErr) {
        console.error(`[freeze] ${tableName} update error:`, updateErr.message)
      }

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
