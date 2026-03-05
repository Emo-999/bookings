const CC_KEY = process.env.CLOUDCART_API_KEY;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORE_URL = 'https://smokezone.cloudcart.net';
const SUPABASE_URL = 'https://exzobwyejtvtqsfrsrvz.supabase.co';

const ccHeaders = { 'X-CloudCart-ApiKey': CC_KEY, 'Content-Type': 'application/vnd.api+json', 'Accept': 'application/vnd.api+json' };
const supaHeaders = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' };

const items = [
  { service_id: 'bbbb0001-0000-0000-0000-000000000001', product_id: '9068', sku: 'svc-bbbb0001', price: 8000,  variant_id: '13385' },
  { service_id: 'bbbb0002-0000-0000-0000-000000000001', product_id: '9069', sku: 'svc-bbbb0002', price: 11000, variant_id: null },
  { service_id: 'bbbb0003-0000-0000-0000-000000000001', product_id: '9070', sku: 'svc-bbbb0003', price: 14500, variant_id: null },
  { service_id: 'dddd0001-0000-0000-0000-000000000002', product_id: '9071', sku: 'svc-dddd0001', price: 2500,  variant_id: null },
  { service_id: 'dddd0002-0000-0000-0000-000000000002', product_id: '9072', sku: 'svc-dddd0002', price: 8000,  variant_id: null },
  { service_id: 'dddd0003-0000-0000-0000-000000000002', product_id: '9073', sku: 'svc-dddd0003', price: 1800,  variant_id: null },
  { service_id: 'dddd0004-0000-0000-0000-000000000002', product_id: '9074', sku: 'svc-dddd0004', price: 1200,  variant_id: null },
];

for (const item of items) {
  let variantId = item.variant_id;

  if (variantId === null) {
    const res = await fetch(STORE_URL + '/api/v2/variants', {
      method: 'POST',
      headers: ccHeaders,
      body: JSON.stringify({
        data: {
          type: 'variants',
          attributes: { price: item.price, quantity: 9999, sku: item.sku },
          relationships: { product: { data: { type: 'products', id: item.product_id } } },
        },
      }),
    });
    const d = await res.json();
    if (!res.ok || !d.data) { console.error('Variant create failed for', item.sku, JSON.stringify(d)); continue; }
    variantId = d.data.id;
    console.log(item.sku, '-> variant', variantId, '(created)');
  } else {
    console.log(item.sku, '-> variant', variantId, '(existing)');
  }

  const supaRes = await fetch(SUPABASE_URL + '/rest/v1/services?id=eq.' + item.service_id, {
    method: 'PATCH',
    headers: supaHeaders,
    body: JSON.stringify({ cloudcart_variant_id: Number(variantId) }),
  });
  if (supaRes.ok) {
    console.log('  Supabase updated OK');
  } else {
    console.error('  Supabase update failed:', await supaRes.text());
  }
}
console.log('Done.');
