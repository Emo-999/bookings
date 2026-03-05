/**
 * One-time setup: Registers the CloudCart order webhook
 * pointing to the Cloudflare Worker.
 *
 * Run: node setup/register-cloudcart-webhook.js
 *
 * Required env vars:
 *   CLOUDCART_API_KEY        — your CloudCart API key
 *   CLOUDCART_WEBHOOK_SECRET — any random string (also set this in Cloudflare Worker secrets)
 */

const STORE_URL      = 'https://smokezone.cloudcart.net';
const WORKER_URL     = 'https://booking-admin.e-kurtisi.workers.dev';
const CC_KEY         = process.env.CLOUDCART_API_KEY;
const WEBHOOK_SECRET = process.env.CLOUDCART_WEBHOOK_SECRET;

if (!CC_KEY || !WEBHOOK_SECRET) {
  console.error('Set CLOUDCART_API_KEY and CLOUDCART_WEBHOOK_SECRET env vars');
  process.exit(1);
}

const ccHeaders = {
  'X-CloudCart-ApiKey': CC_KEY,
  'Content-Type': 'application/vnd.api+json',
  'Accept': 'application/vnd.api+json',
};

// Register webhook for paid orders
const res = await fetch(`${STORE_URL}/api/v2/webhooks`, {
  method: 'POST',
  headers: ccHeaders,
  body: JSON.stringify({
    data: {
      type: 'webhooks',
      attributes: {
        event: 'order.updated',
        url: `${WORKER_URL}/api/webhook/cloudcart`,
        active: true,
      },
    },
  }),
});

const data = await res.json();
if (res.ok) {
  console.log('Webhook registered:', data.data?.id);
  console.log('URL:', `${WORKER_URL}/api/webhook/cloudcart`);
  console.log('Topic: orders/paid');
} else {
  console.error('Failed to register webhook:', JSON.stringify(data));
}
