export const triggerWebhook = async () => {
  // Only trigger rebuild webhook in production unless explicitly enabled
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.ENABLE_WEBHOOK !== 'true'
  ) {
    return
  }

  const secretToken = process.env.WEBHOOK_SECRET || 'MY_SUPER_SECRET_TOKEN_2026'
  const webhookBaseUrl =
    process.env.WEBHOOK_URL || 'https://alexis-vuadelle.com/webhook-payload.php'
  const url = `${webhookBaseUrl}?token=${encodeURIComponent(secretToken)}`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) {
      console.error('Webhook triggered but failed:', res.status, res.statusText)
    } else {
      console.log('Webhook successfully triggered. Rebuild started.')
    }
  } catch (err) {
    console.error('Failed to trigger webhook:', err)
  }
}
