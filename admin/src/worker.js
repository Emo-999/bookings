// Cloudflare Worker — API endpoints for the booking system
// Handles /api/reserve and /api/webhook/cloudcart
// All other requests are served from the static SPA assets

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || 'https://smokezone.cloudcart.net',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders('https://smokezone.cloudcart.net'),
      ...extraHeaders,
    },
  });
}

// ============================================================
// POST /api/reserve
// Creates a pending booking in Supabase and returns the
// CloudCart cart redirect URL.
// ============================================================
async function handleReserve(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }

  const {
    business_id, resource_id, service_id,
    customer_name, customer_email, customer_phone, notes,
    start_datetime, end_datetime, guests,
  } = body;

  if (!business_id || !resource_id || !service_id ||
      !customer_name || !customer_email ||
      !start_datetime || !end_datetime) {
    return json({ error: 'Missing required fields' }, 400);
  }

  const supaHeaders = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };

  // 1. Fetch the service to get cloudcart_variant_id and duration_minutes
  const svcRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/services?id=eq.${service_id}` +
    `&select=id,price,cloudcart_variant_id,duration_minutes`,
    { headers: supaHeaders }
  );
  const services = await svcRes.json();
  const service = services[0];

  if (!service?.cloudcart_variant_id) {
    return json({ error: 'Service not yet linked to a CloudCart product. Run setup first.' }, 422);
  }

  // 2. Compute quantity (nights for hotel, 1 for salon)
  const quantity = service.duration_minutes == null
    ? Math.ceil((new Date(end_datetime) - new Date(start_datetime)) / 86400000)
    : 1;

  // 3. Insert pending booking
  const bookingPayload = {
    business_id,
    resource_id,
    service_id,
    customer_name,
    customer_email,
    customer_phone: customer_phone || null,
    notes: notes || null,
    start_datetime,
    end_datetime,
    guests: guests || null,
    status: 'pending',
  };

  const insRes = await fetch(`${env.SUPABASE_URL}/rest/v1/bookings`, {
    method: 'POST',
    headers: { ...supaHeaders, Prefer: 'return=representation' },
    body: JSON.stringify(bookingPayload),
  });

  if (!insRes.ok) {
    const err = await insRes.json().catch(() => ({}));
    return json({ error: err?.message || 'Booking creation failed' }, 500);
  }

  const bookings = await insRes.json();
  const booking = bookings[0];

  // 4. Build CloudCart cart redirect URL
  const cartUrl = `${env.CLOUDCART_STORE_URL}/cart/add/${service.cloudcart_variant_id}/${quantity}`;

  return json({ booking_id: booking.id, cart_url: cartUrl });
}

// ============================================================
// POST /api/webhook/cloudcart
// Receives CloudCart order webhooks, verifies HMAC signature,
// and confirms the booking in Supabase.
// ============================================================
async function verifyWebhook(request, secret) {
  const rawBody = await request.text();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  const computed = btoa(String.fromCharCode(...new Uint8Array(sig)));
  const received = request.headers.get('X-CloudCart-Hmac-SHA256') || '';
  if (computed !== received) return null;
  try { return JSON.parse(rawBody); }
  catch { return null; }
}

async function handleWebhook(request, env) {
  const payload = await verifyWebhook(request, env.CLOUDCART_WEBHOOK_SECRET);
  if (!payload) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { event, data: order } = payload;

  // Only process paid/complete orders
  const isPaid = event === 'orders/paid' || event === 'order/paid' ||
                 (event === 'orders/update' && order?.status === 'paid') ||
                 order?.status === 'complete';
  if (!isPaid) {
    return new Response('OK', { status: 200 });
  }

  // Extract booking_id from order note
  const note = order?.note_customer || order?.order_note || '';
  const match = note.match(
    /Booking ID:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
  );
  if (!match) {
    return new Response('OK', { status: 200 }); // not our order
  }
  const bookingId = match[1];

  const supaHeaders = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };

  const updateRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}`,
    {
      method: 'PATCH',
      headers: supaHeaders,
      body: JSON.stringify({
        status: 'confirmed',
        cloudcart_order_id: String(order.id),
        cloudcart_order_status: order.status,
      }),
    }
  );

  if (!updateRes.ok) {
    console.error('Failed to confirm booking', bookingId, await updateRes.text());
  }

  return new Response('OK', { status: 200 });
}

// ============================================================
// Main fetch handler
// ============================================================
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders('https://smokezone.cloudcart.net'),
      });
    }

    if (url.pathname === '/api/reserve' && request.method === 'POST') {
      return handleReserve(request, env);
    }

    if (url.pathname === '/api/webhook/cloudcart' && request.method === 'POST') {
      return handleWebhook(request, env);
    }

    // Serve SPA static assets for everything else
    return env.ASSETS.fetch(request);
  },
};
