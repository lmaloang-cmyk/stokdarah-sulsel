// Keep-alive endpoint — prevents Vercel from suspending the project
// Called by Vercel cron every 5 minutes
// Just returns a simple response to keep the project warm

export default async function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    message: 'Project is alive',
    timestamp: new Date().toISOString()
  })
}
