export const triggerWebhook = async () => {
  const secretToken = 'MY_SUPER_SECRET_TOKEN_2026';
  const url = `https://alexis-vuadelle.com/webhook-payload.php?token=${secretToken}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error('Webhook triggered but failed:', res.status, res.statusText);
    } else {
      console.log('Webhook successfully triggered. Rebuild started.');
    }
  } catch (err) {
    console.error('Failed to trigger webhook:', err);
  }
}
