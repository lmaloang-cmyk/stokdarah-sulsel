// Test endpoint — cek apakah environment variables ada
export default async function handler(req, res) {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '(not set)'
  const keyPreview = hasKey ? process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20) + '...' : '(not set)'

  return res.json({
    success: hasUrl && hasKey,
    env: {
      SUPABASE_URL: hasUrl ? 'SET ✓' : 'MISSING ✗',
      SERVICE_ROLE_KEY: hasKey ? 'SET ✓' : 'MISSING ✗',
      url_preview: url,
      key_preview: keyPreview
    }
  })
}
