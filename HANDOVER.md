# CloudCart Booking System — Project Handover

## What This Is
A booking system integrated directly into a CloudCart e-commerce store. Customers book hotel rooms or salon appointments through a widget embedded on the CloudCart store, pay through the CloudCart checkout, and bookings are confirmed automatically when payment is received.

## Live URLs
| Resource | URL |
|---|---|
| CloudCart Store | https://smokezone.cloudcart.net |
| Admin Panel | https://booking-admin.e-kurtisi.workers.dev |
| Widget JS | https://booking-admin.e-kurtisi.workers.dev/widget.js |
| API Worker | https://booking-admin.e-kurtisi.workers.dev/api/reserve |
| Webhook Endpoint | https://booking-admin.e-kurtisi.workers.dev/api/webhook/cloudcart |

---

## How the Booking Flow Works

```
1. Customer opens CloudCart store page with the booking widget embedded
2. Customer selects dates/times, fills in their details, clicks "Confirm & Pay"
3. Widget POSTs to /api/reserve → creates a PENDING booking in Supabase
4. Customer is redirected to CloudCart cart (product auto-added)
5. At checkout, a hidden JS snippet auto-fills the order note: "Booking ID: <uuid>"
6. Customer pays via CloudCart (bank transfer, card, etc.)
7. CloudCart fires an order.updated webhook to our Worker
8. Worker reads the Booking ID from the order note, updates booking to CONFIRMED
9. Admin sees booking as Confirmed in the admin panel
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Widget | Vanilla JS (embedded via `<script>` tag) |
| Admin Panel | React + Vite SPA |
| Backend API | Cloudflare Worker (edge function) |
| Database | Supabase (PostgreSQL + Row Level Security) |
| Payments | CloudCart checkout (existing payment methods) |
| Hosting | Cloudflare Workers (worker + static assets together) |

---

## Architecture — Files

```
booking-system-CloudCart/
├── admin/                          # React admin + Cloudflare Worker
│   ├── src/
│   │   ├── worker.js               # Cloudflare Worker (API endpoints)
│   │   └── App.jsx + pages/        # React admin panel
│   ├── public/
│   │   └── widget.js               # Widget served as static file
│   └── wrangler.jsonc              # Cloudflare Worker config
├── widget/
│   └── src/widget.js               # Widget source (copy to admin/public/ after edits)
├── supabase/
│   └── migrations/
│       └── 001_cloudcart_integration.sql
└── setup/
    ├── create-cloudcart-products.js   # One-time: creates CC products
    ├── patch-variants.mjs             # One-time: links variant IDs to Supabase
    └── register-cloudcart-webhook.js  # One-time: registers CC webhook
```

---

## Database (Supabase)

**Project:** https://exzobwyejtvtqsfrsrvz.supabase.co

### Key Tables
| Table | Purpose |
|---|---|
| `businesses` | Hotel Adriatic, Salon Bella — each is a tenant |
| `resources` | Hotel rooms / salon staff members |
| `services` | Rate plans (Room Only, B&B, etc.) / treatments (Haircut, etc.) |
| `bookings` | All bookings with status: pending → confirmed / cancelled |

### CloudCart Columns Added (migration 001)
- `services.cloudcart_variant_id` — links each service to a CloudCart product variant
- `bookings.cloudcart_order_id` — CloudCart order ID after payment
- `bookings.cloudcart_order_status` — order status from CloudCart

### Booking Statuses
- `pending` — customer clicked Confirm & Pay, not yet paid
- `confirmed` — payment received, webhook confirmed
- `cancelled` — manually cancelled by admin

---

## CloudCart Setup

### Products Created ("Bookings" category, id=654)
| Service | CloudCart Product ID | Variant ID | Price |
|---|---|---|---|
| Hotel Adriatic — Room Only | 9068 | 13385 | €80/night |
| Hotel Adriatic — Bed & Breakfast | 9069 | 13386 | €110/night |
| Hotel Adriatic — Half Board | 9070 | 13387 | €145/night |
| Salon Bella — Haircut | 9071 | 13388 | €25 |
| Salon Bella — Color & Highlights | 9072 | 13389 | €80 |
| Salon Bella — Men's Cut | 9073 | 13390 | €18 |
| Salon Bella — Beard Trim | 9074 | 13391 | €12 |

All products: `digital: yes`, `shipping: no` (skips shipping address at checkout).

### Webhook
- **ID:** 2
- **Event:** order.updated
- **URL:** https://booking-admin.e-kurtisi.workers.dev/api/webhook/cloudcart
- **Triggers on:** status = "paid"

### Custom JS (in CloudCart Admin → Settings → General Settings)
Paste this — auto-fills and hides the order note with the Booking ID:
```javascript
(function () {
  const KEY = 'bw_pending_booking';
  const TTL = 2 * 60 * 60 * 1000;
  function fillNote() {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    let data;
    try { data = JSON.parse(raw); } catch { return; }
    if (!data.booking_id || Date.now() - data.ts > TTL) { localStorage.removeItem(KEY); return; }
    const note = document.getElementById('checkout-note');
    if (note && !note.value) {
      note.value = 'Booking ID: ' + data.booking_id;
      note.dispatchEvent(new Event('input', { bubbles: true }));
      note.dispatchEvent(new Event('change', { bubbles: true }));
      const section = note.closest('.cc-form-section') || note.closest('.js-complex-field');
      if (section) section.style.display = 'none';
    }
  }
  fillNote();
  new MutationObserver(fillNote).observe(document.body, { childList: true, subtree: true });
})();
```

---

## Cloudflare Worker Secrets

Set via `npx wrangler secret put <NAME>` in the `admin/` folder:

| Secret | Value |
|---|---|
| `SUPABASE_URL` | https://exzobwyejtvtqsfrsrvz.supabase.co |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase → Project Settings → API → service_role |
| `CLOUDCART_WEBHOOK_SECRET` | CloudCart API key (for future auth if needed) |

The var `CLOUDCART_STORE_URL` is set in `wrangler.jsonc` (not a secret).

---

## Embedding the Widget on a CloudCart Page

Add a page in CloudCart with this HTML:

```html
<script src="https://booking-admin.e-kurtisi.workers.dev/widget.js"></script>
<div
  data-cloudcart-booking
  data-business-id="11111111-0000-0000-0000-000000000001"
  data-supabase-url="https://exzobwyejtvtqsfrsrvz.supabase.co"
  data-supabase-key="YOUR_ANON_KEY"
  data-worker-url="https://booking-admin.e-kurtisi.workers.dev"
></div>
```

Business IDs:
- Hotel Adriatic: `11111111-0000-0000-0000-000000000001`
- Salon Bella: `22222222-0000-0000-0000-000000000002`

---

## Deploy / Update Process

**After any code change to the worker or admin panel:**
```bash
cd admin
npm run build
npx wrangler deploy
```

**After any change to widget/src/widget.js:**
```bash
cp widget/src/widget.js admin/public/widget.js
cd admin && npm run build && npx wrangler deploy
```

**If webhook gets deactivated** (CloudCart deactivates on errors):
Go to CloudCart Admin → Settings → Webhooks → toggle Active back on.
Or run:
```bash
CLOUDCART_API_KEY=... node -e "
fetch('https://smokezone.cloudcart.net/api/v2/webhooks/2', {
  method: 'PATCH',
  headers: { 'X-CloudCart-ApiKey': process.env.CLOUDCART_API_KEY, 'Content-Type': 'application/vnd.api+json', 'Accept': 'application/vnd.api+json' },
  body: JSON.stringify({ data: { type: 'webhooks', id: '2', attributes: { active: true } } })
}).then(r => console.log(r.status));
"
```

---

## Adding a New Business / Tenant

1. Insert into `businesses` table in Supabase
2. Insert rooms/staff into `resources`
3. Insert services into `services`
4. Create CloudCart products for each service (use `setup/create-cloudcart-products.js` as template)
5. Update `services.cloudcart_variant_id` in Supabase with the new variant IDs
6. Embed the widget on a CloudCart page with the new `data-business-id`

---

## Known Limitations / Future Work
- **Abandoned bookings:** Pending bookings with no payment after 2h should be auto-cancelled (needs a pg_cron job in Supabase)
- **Email notifications:** No automated emails to customers on confirmation (can be added via Supabase Edge Functions or CloudCart's built-in email)
- **Price sync:** If service prices change in Supabase, CloudCart product prices must be updated manually via API
- **Multi-session carts:** If a customer adds multiple booking services to cart, only one Booking ID is stored in localStorage (last one wins)
