# CloudCart Booking System — Step-by-Step Implementation Guide

This guide covers everything needed to set up this booking system from scratch on a new CloudCart store.

---

## Prerequisites
- A CloudCart store with admin access and an API key
- A Supabase project (free tier works)
- A Cloudflare account (free tier works)
- Node.js 18+ installed locally
- Git

---

## PHASE 1 — Supabase Database

### Step 1.1 — Create Supabase Project
1. Go to https://supabase.com → New project
2. Note your **Project URL** and two API keys:
   - `anon` key (public, used in widget)
   - `service_role` key (secret, used in Worker — never expose this)

### Step 1.2 — Run the Base Schema
1. Go to Supabase dashboard → SQL Editor
2. Open the file `supabase/schema.sql` from this repo
3. Paste and run it — this creates all tables, RLS policies, and RPC functions

### Step 1.3 — Seed Demo Data (optional)
1. Open `supabase/seed.sql`
2. Run it to insert Hotel Adriatic and Salon Bella with rooms, staff, and services

### Step 1.4 — Run CloudCart Integration Migration
1. Open `supabase/migrations/001_cloudcart_integration.sql`
2. Run it — adds `cloudcart_variant_id` to services, `cloudcart_order_id` to bookings

### Step 1.5 — Link Admin User to a Business
After the admin user signs up (Step 3.3), run this in SQL Editor:
```sql
-- Replace the email and business_id with your values
INSERT INTO business_members (user_id, business_id, role)
SELECT id, '11111111-0000-0000-0000-000000000001', 'owner'
FROM auth.users WHERE email = 'your@email.com';
```

Business IDs from seed data:
- Hotel Adriatic: `11111111-0000-0000-0000-000000000001`
- Salon Bella: `22222222-0000-0000-0000-000000000002`

To give one user access to BOTH businesses, insert two rows (one per business).
> ⚠️ Currently the admin panel only shows one business per user (uses `.single()`). To support multiple businesses, the admin panel needs a business switcher — see Phase 6.

---

## PHASE 2 — Cloudflare Worker (Backend API)

### Step 2.1 — Install Wrangler CLI
```bash
npm install -g wrangler
wrangler login   # Opens browser — log in with your Cloudflare account
```

### Step 2.2 — Install Dependencies
```bash
cd admin
npm install
```

### Step 2.3 — Update wrangler.jsonc
Edit `admin/wrangler.jsonc`:
- Change `name` to whatever you want the worker to be called
- Change `CLOUDCART_STORE_URL` to your store URL

### Step 2.4 — Set Secrets
Run these one by one in the `admin/` directory — you'll be prompted to paste the value:
```bash
npx wrangler secret put SUPABASE_URL
# Paste: https://your-project.supabase.co

npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Paste: your service_role key from Supabase

npx wrangler secret put CLOUDCART_WEBHOOK_SECRET
# Paste: your CloudCart API key
```

### Step 2.5 — Build and Deploy
```bash
npm run build
npx wrangler deploy
```

Note the deployed URL — e.g. `https://your-worker-name.your-account.workers.dev`

> ⚠️ Always run `npm run build` BEFORE `npx wrangler deploy`. Deploy alone reuses old compiled code.

---

## PHASE 3 — Admin Panel

### Step 3.1 — Configure Supabase Credentials
The admin panel reads credentials from environment variables. For local dev:
```bash
cd admin
cp .env.example .env   # or create .env manually
```

`.env` contents:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

For production (Cloudflare), the credentials are hardcoded as fallbacks in `admin/src/lib/supabase.js`.

### Step 3.2 — Run Locally (optional)
```bash
cd admin
npm run dev
```
Opens at http://localhost:5173

### Step 3.3 — Create Your Admin Account
1. Open the admin panel (local or deployed)
2. Enter your email → receive magic link → click it
3. You are now logged in but not linked to any business
4. Run the SQL from Step 1.5 to link yourself to a business

### Step 3.4 — Update Supabase Auth Settings
In Supabase → Authentication → URL Configuration:
- **Site URL:** your deployed Worker URL (e.g. `https://your-worker.workers.dev`)
- **Redirect URLs:** same URL

This ensures magic link emails redirect to production, not localhost.

---

## PHASE 4 — CloudCart Products Setup (One-time)

### Step 4.1 — Get Your CloudCart API Key
CloudCart Admin → Settings → API Keys → copy your key

### Step 4.2 — Create Products
```bash
cd booking-system-CloudCart  # project root
CLOUDCART_API_KEY=your-key SUPABASE_SERVICE_ROLE_KEY=your-key node setup/create-cloudcart-products.js
```

This creates 7 products in a "Bookings" category and writes variant IDs back to Supabase.

> ⚠️ If it fails partway, products may exist already. Check CloudCart Admin → Products before re-running.

### Step 4.3 — Verify in Supabase
```sql
SELECT name, cloudcart_variant_id FROM services;
```
All 7 rows should have a non-null `cloudcart_variant_id`.

### Step 4.4 — Register the Webhook
```bash
CLOUDCART_API_KEY=your-key CLOUDCART_WEBHOOK_SECRET=anything node setup/register-cloudcart-webhook.js
```

Verify in CloudCart Admin → Settings → Webhooks — you should see one entry for "Order is updated".

### Step 4.5 — Add Custom JS to CloudCart
CloudCart Admin → Design →  scroll to **Custom JS** :

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

## PHASE 5 — Widget Embedding on CloudCart

### Step 5.1 — Create a Page in CloudCart
CloudCart Admin → Pages → Add new page (e.g. "Book a Room" or "Book Appointment")

### Step 5.2 — Add Widget HTML
Switch to HTML/source mode and paste:

**For Hotel Adriatic:**
```html
<script src="https://your-worker.workers.dev/widget.js"></script>
<div
  data-cloudcart-booking
  data-business-id="11111111-0000-0000-0000-000000000001"
  data-supabase-url="https://your-project.supabase.co"
  data-supabase-key="YOUR_ANON_KEY"
  data-worker-url="https://your-worker.workers.dev"
></div>
```

**For Salon Bella:**
```html
<script src="https://your-worker.workers.dev/widget.js"></script>
<div
  data-cloudcart-booking
  data-business-id="22222222-0000-0000-0000-000000000002"
  data-supabase-url="https://your-project.supabase.co"
  data-supabase-key="YOUR_ANON_KEY"
  data-worker-url="https://your-worker.workers.dev"
></div>
```

### Step 5.3 — Link Product Pages to the Booking Widget
On each CloudCart product page (Room Only, Bed & Breakfast, etc.):
1. CloudCart Admin → Products → edit product → Description
2. Add a "Book Now" button linking to your booking page:
   ```html
   <a href="/book-a-room" class="btn btn-primary">Book Now</a>
   ```
3. Disable the "Add to Cart" button: CloudCart Admin → Products → edit → uncheck "Active" for purchase, OR use CloudCart's product page custom HTML to hide the cart button with CSS:
   ```css
   .js-product-buy-form { display: none; }
   ```
   Add this to CloudCart Admin → Settings → Branding Settings → Custom CSS.

---

## PHASE 6 — Ongoing Operations

### Adding a New Service to an Existing Business
1. Insert into `services` table in Supabase with the business_id
2. Create a CloudCart product manually or via script
3. Update `services.cloudcart_variant_id` in Supabase with the new variant ID

### Adding an Entirely New Business (new tenant)
1. Insert into `businesses`, `resources`, `services` in Supabase
2. Create CloudCart products for each service
3. Create a new admin user and link via `business_members`
4. Add a new page on CloudCart with the widget embed and the new `data-business-id`

### If the Webhook Gets Deactivated
CloudCart auto-deactivates webhooks when they receive errors. To re-activate:
- CloudCart Admin → Settings → Webhooks → toggle the webhook Active
- OR fix the underlying error first (check Cloudflare Worker logs via `npx wrangler tail`)

### Deploying Code Changes
```bash
cd admin
npm run build       # Always build first
npx wrangler deploy
```

### Updating Widget Code
```bash
# Edit widget/src/widget.js, then:
cp widget/src/widget.js admin/public/widget.js
cd admin && npm run build && npx wrangler deploy
```

---

## PHASE 7 — Testing the Full Flow

1. Open a CloudCart product page (e.g. Hotel Adriatic — Room Only)
2. Click your "Book Now" link → opens the booking widget page
3. Fill in: dates, guest info, click **Confirm & Pay**
4. You're redirected to CloudCart cart with the product added
5. Proceed to checkout — the order note is auto-filled and hidden
6. Select a payment method and complete the order
7. In CloudCart Admin → Orders → find the order → **Mark as paid**
8. Open the Booking Admin panel → Bookings → status should flip to **Confirmed**

---

## PHASE 8 — Architecture Reference

```
Customer browser
    │
    ├── [CloudCart store page]
    │       └── booking widget (widget.js from Worker)
    │               │ POST /api/reserve
    │               ▼
    │       Cloudflare Worker (booking-admin)
    │               │ INSERT pending booking
    │               ▼
    │           Supabase DB ◄─────────────────────────────────┐
    │               │                                          │
    │       returns {booking_id, cart_url}                     │
    │               │                                          │
    ├── localStorage.setItem(booking_id)                       │
    ├── redirect to CloudCart cart                             │
    │                                                          │
    ├── [CloudCart checkout]                                   │
    │       └── Custom JS fills #checkout-note                 │
    │               with "Booking ID: <uuid>"                  │
    │                                                          │
    ├── Customer pays                                          │
    │                                                          │
    └── [CloudCart fires order.updated webhook]                │
                    │                                          │
            Cloudflare Worker                                  │
                    │ reads note_customer                      │
                    │ extracts Booking ID UUID                 │
                    │ PATCH status = confirmed ─────────────────┘
```
