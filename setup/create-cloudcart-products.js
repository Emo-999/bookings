/**
 * One-time setup: Creates CloudCart products for each bookable service
 * and writes the cloudcart_variant_id back to Supabase.
 *
 * Run: node setup/create-cloudcart-products.js
 *
 * Required env vars:
 *   CLOUDCART_API_KEY         — your CloudCart API key
 *   SUPABASE_SERVICE_ROLE_KEY — from Supabase > Project Settings > API
 */

const STORE_URL     = 'https://smokezone.cloudcart.net';
const SUPABASE_URL  = 'https://exzobwyejtvtqsfrsrvz.supabase.co';
const CC_KEY        = process.env.CLOUDCART_API_KEY;
const SUPA_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!CC_KEY || !SUPA_KEY) {
  console.error('Set CLOUDCART_API_KEY and SUPABASE_SERVICE_ROLE_KEY env vars');
  process.exit(1);
}

const products = [
  // Hotel Adriatic — rate plans (qty = nights at checkout)
  { service_id: 'bbbb0001-0000-0000-0000-000000000001', name: 'Hotel Adriatic — Room Only',         sku: 'svc-bbbb0001', price: 8000,   description: 'Accommodation only, no meals included. Price per night.' },
  { service_id: 'bbbb0002-0000-0000-0000-000000000001', name: 'Hotel Adriatic — Bed & Breakfast',   sku: 'svc-bbbb0002', price: 11000,  description: 'Accommodation with daily breakfast. Price per night.' },
  { service_id: 'bbbb0003-0000-0000-0000-000000000001', name: 'Hotel Adriatic — Half Board',        sku: 'svc-bbbb0003', price: 14500,  description: 'Accommodation with breakfast and dinner. Price per night.' },
  // Salon Bella — services (qty = 1 at checkout)
  { service_id: 'dddd0001-0000-0000-0000-000000000002', name: 'Salon Bella — Haircut',              sku: 'svc-dddd0001', price: 2500,   description: 'Haircut, 45 min.' },
  { service_id: 'dddd0002-0000-0000-0000-000000000002', name: 'Salon Bella — Color & Highlights',   sku: 'svc-dddd0002', price: 8000,   description: 'Color and highlights, 120 min.' },
  { service_id: 'dddd0003-0000-0000-0000-000000000002', name: "Salon Bella — Men's Cut",            sku: 'svc-dddd0003', price: 1800,   description: "Men's haircut, 30 min." },
  { service_id: 'dddd0004-0000-0000-0000-000000000002', name: 'Salon Bella — Beard Trim',           sku: 'svc-dddd0004', price: 1200,   description: 'Beard trim, 20 min.' },
];

const ccHeaders = {
  'X-CloudCart-ApiKey': CC_KEY,
  'Content-Type': 'application/vnd.api+json',
  'Accept': 'application/vnd.api+json',
};

const supaHeaders = {
  apikey: SUPA_KEY,
  Authorization: `Bearer ${SUPA_KEY}`,
  'Content-Type': 'application/json',
};

// 1. "Bookings" category already created (id=654) — skip re-creation
const categoryId = '654';
console.log(`Using existing Bookings category: id=${categoryId}`);

// 2. Create each product under that category
for (const p of products) {
  console.log(`\nCreating: ${p.name}`);

  const ccRes = await fetch(`${STORE_URL}/api/v2/products`, {
    method: 'POST',
    headers: ccHeaders,
    body: JSON.stringify({
      data: {
        type: 'products',
        attributes: {
          name: p.name,
          sku: p.sku,
          price: p.price,
          quantity: 9999,
          active: 'yes',
          tracking: 'no',
          shipping: 'no',
          digital: 'no',
          sale: 'no',
          description: p.description,
        },
        relationships: {
          category: { data: { type: 'categories', id: String(categoryId) } },
        },
      },
    }),
  });

  const ccData = await ccRes.json();
  if (!ccRes.ok || !ccData.data) {
    console.error('  CloudCart create failed:', JSON.stringify(ccData));
    continue;
  }
  const productId = ccData.data.id;
  console.log(`  Product created: id=${productId}`);

  // 3. Fetch the default variant ID
  const varRes = await fetch(
    `${STORE_URL}/api/v2/variants?filter[product_id]=${productId}`,
    { headers: ccHeaders }
  );
  const varData = await varRes.json();
  const variantId = varData.data?.[0]?.id;

  if (!variantId) {
    console.error('  Could not find variant for product', productId);
    continue;
  }
  console.log(`  Variant id=${variantId}`);

  // 4. Write variant ID back to Supabase
  const supaRes = await fetch(
    `${SUPABASE_URL}/rest/v1/services?id=eq.${p.service_id}`,
    {
      method: 'PATCH',
      headers: supaHeaders,
      body: JSON.stringify({ cloudcart_variant_id: Number(variantId) }),
    }
  );

  if (supaRes.ok) {
    console.log(`  Saved cloudcart_variant_id=${variantId} to Supabase`);
  } else {
    console.error('  Supabase update failed:', await supaRes.text());
  }
}

console.log('\nDone.');
