// Vercel Serverless Function — /api/freeze
// Freeze records inactive for 7+ days
// Uses two separate queries to avoid .or() / RPC limitations

export default async function handler(req, res) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Missing environment variables' })
  }

  // Load Supabase client server-side
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, supabaseKey)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const results = { announcements: 0, requests: 0, events: 0 }
  let totalFrozen = 0

  // Helper: freeze records older than 7 days using two separate queries
  async function freezeTable(tableName) {
    try {
      // Query 1: count records with last_active IS NULL and is_frozen = false
      const { count: countNull, error: e1 } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .is('is_frozen', false)
        .is('last_active', null)

      if (e1) {
        console.error(`[freeze] ${tableName} count-null:`, e1.message)
        return 0
      }

      // Query 2: count records where last_active < 7 days ago and is_frozen = false
      const { count: countDate, error: e2 } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .lt('last_active', sevenDaysAgo)
        .eq('is_frozen', false)

      if (e2) {
        console.error(`[freeze] ${tableName} count-date:`, e2.message)
        return countNull || 0
      }

      const count = (countNull || 0) + (countDate || 0)

      // Perform the actual updates separately
      if (countNull > 0) {
        await supabase.from(tableName).update({ is_frozen: true })
          .is('is_frozen', false)
          .is('last_active', null)
      }
      if (countDate > 0) {
        await supabase.from(tableName).update({ is_frozen: true })
          .eq('is_frozen', false)
          .lt('last_active', sevenDaysAgo)
      }

      console.log(`[freeze] ${tableName}: ${count} frozen`)
      return count
    } catch (e) {
      console.error(`[freeze] ${tableName} exception:`, e.message)
      return 0
    }
  }

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
