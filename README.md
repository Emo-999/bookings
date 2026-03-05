# CloudCart Booking System

Multi-tenant booking system for hotels and hair salons.
Widget embedded on CloudCart → payments via CloudCart checkout → booking confirmed automatically on payment.

---

## Live Deployment

| Resource | URL |
|---|---|
| **Admin Panel** | https://booking-admin.e-kurtisi.workers.dev |
| **CloudCart Store** | https://smokezone.cloudcart.net |
| **Widget JS** | https://booking-admin.e-kurtisi.workers.dev/widget.js |
| **API — Reserve** | `POST` https://booking-admin.e-kurtisi.workers.dev/api/reserve |
| **API — Webhook** | `POST` https://booking-admin.e-kurtisi.workers.dev/api/webhook/cloudcart |
| **Supabase Project** | https://supabase.com/dashboard/project/exzobwyejtvtqsfrsrvz |

### Customer-facing booking pages (on CloudCart)
| Business | Booking Page |
|---|---|
| Hotel Adriatic | https://smokezone.cloudcart.net/book-a-room *(create page — see STEP-BY-STEP-GUIDE.md Phase 5)* |
| Salon Bella | https://smokezone.cloudcart.net/book-appointment *(create page — see STEP-BY-STEP-GUIDE.md Phase 5)* |

---

## Stack

| Layer | Technology |
|-------|-----------|
| Storefront | CloudCart (embeddable widget) |
| Admin panel | React + Vite → Cloudflare Pages |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth (magic link) |
| Availability logic | Supabase RPC (SQL functions) |

---

## Project Structure

```
booking-system-CloudCart/
├── supabase/
│   ├── schema.sql      — all tables + indexes
│   ├── rls.sql         — row level security policies
│   ├── functions.sql   — availability RPC functions
│   └── seed.sql        — sample hotel + salon data
├── widget/
│   └── src/widget.js   — embeddable booking widget (vanilla JS)
└── admin/              — React admin panel (Cloudflare Pages)
    ├── src/
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Bookings.jsx
    │   │   ├── Availability.jsx
    │   │   └── Dashboard.jsx
    │   ├── components/Layout.jsx
    │   ├── lib/supabase.js
    │   ├── App.jsx
    │   └── main.jsx
    └── .env.example
```

---

## Setup

### 1. Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. In the SQL editor, run in order:
   - `supabase/schema.sql`
   - `supabase/rls.sql`
   - `supabase/functions.sql`
   - `supabase/seed.sql` (optional, for testing)
3. Note your **Project URL** and **anon key** from Project Settings → API

### 2. Admin Panel (Cloudflare Pages)

```bash
cd admin
cp .env.example .env
# Fill in your Supabase URL and anon key in .env

npm install
npm run dev          # local development
npm run build        # production build → dist/
```

**Deploy to Cloudflare Pages:**
1. Push `admin/` to a GitHub repo
2. Connect repo in Cloudflare Pages dashboard
3. Build command: `npm run build`
4. Build output: `dist`
5. Add environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### 3. Onboard a business owner

After deploying, add the owner's email as a Supabase Auth user and link them to a business:

```sql
-- After owner signs in via magic link, run:
insert into business_members (user_id, business_id, role)
values (
  '<uuid from auth.users>',
  '<business id from businesses table>',
  'owner'
);
```

### 4. Widget — embed in CloudCart

In CloudCart's page editor, add a **Custom HTML block** and paste:

```html
<!-- Hotel example -->
<div
  data-cloudcart-booking
  data-business-id="YOUR_BUSINESS_ID"
  data-supabase-url="https://YOUR_PROJECT.supabase.co"
  data-supabase-key="YOUR_ANON_KEY"
></div>
<script src="https://YOUR_CDN/booking-widget.js"></script>
```

To host the widget JS, upload `widget/src/widget.js` to any static host
(Cloudflare Pages, GitHub Pages, R2, etc.) and use that URL in the `<script>` tag.

---

## Business Types

| Feature | Hotel | Salon |
|---------|-------|-------|
| Resource | Room | Staff member |
| Booking unit | Date range (nights) | Time slot |
| Service | Rate plan (optional) | Required (defines duration) |
| Availability | Date-based | Time slot based |
| Calendar | Check-in / Check-out range picker | Single date + slot picker |

---

## Security Notes

- The widget uses the **anon key** — safe to expose publicly
- RLS policies ensure customers can only INSERT bookings, never read others'
- Owners authenticate via magic link and can only see their own business data
- The overlap constraint on `bookings` prevents double-booking at the DB level
