# CloudCart Booking System — Full Project Plan

## What We're Building
A multi-tenant booking system embedded inside CloudCart stores.
Works for both **hotels** (date range / rooms) and **hair salons** (time slots / staff).
No server-side code on CloudCart — everything runs via an embeddable JS widget + Supabase + Cloudflare Pages.

---

## Tech Stack

| Layer | Technology | Cost |
|-------|-----------|------|
| Storefront | CloudCart (custom HTML block) | Already paying |
| Booking widget | Vanilla JS (no dependencies) | Free |
| Database + Auth | Supabase (Postgres + RLS + Magic Link) | Free tier |
| Admin panel | React + Vite | Free |
| Admin hosting | Cloudflare Pages | Free |

---

## Project Structure

```
booking-system-CloudCart/
├── supabase/
│   ├── schema.sql       — all tables + indexes
│   ├── rls.sql          — row level security policies
│   ├── functions.sql    — availability RPC functions
│   └── seed.sql         — sample hotel + salon data
├── widget/
│   └── src/widget.js    — embeddable booking widget (vanilla JS)
├── admin/               — React admin panel
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Bookings.jsx       — view/confirm/cancel bookings
│   │   │   ├── Availability.jsx   — manage weekly hours + blocked dates
│   │   │   └── Dashboard.jsx      — stats + upcoming bookings
│   │   ├── components/Layout.jsx
│   │   ├── lib/supabase.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
├── PLAN.md              — this file
└── README.md            — technical reference
```

---

## Architecture

```
CloudCart (storefront)            Cloudflare Pages (free)
  └── Custom HTML block             └── Admin Panel (React)
        └── widget.js                     └── Magic link login
              │                                 │
              └─────────────────────────────────┘
                                    │
                              Supabase
                          ┌─────────────────┐
                          │  Postgres DB     │
                          │  Auth            │
                          │  RLS Policies    │
                          │  RPC Functions   │
                          └─────────────────┘
```

**How it works:**
- Hotel/salon owner embeds the widget on their CloudCart page with 2 lines of HTML
- Widget detects business type (hotel vs salon) and renders the correct booking flow
- Bookings are saved directly to Supabase via the anon key (safe — RLS prevents abuse)
- Owner logs into the admin panel via magic link (no password needed)
- Admin panel is hosted publicly on Cloudflare Pages

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `businesses` | Each hotel or salon (type, slug, timezone) |
| `business_members` | Links owner accounts to their business |
| `resources` | Rooms (hotel) or staff members (salon) |
| `services` | Rate plans (hotel) or haircut/coloring (salon) |
| `resource_services` | Which staff member does which service |
| `availability_schedules` | Weekly working hours per resource |
| `blocked_periods` | Vacations, maintenance, holidays |
| `bookings` | All bookings — unified for both hotel and salon |

---

## Progress Checklist

### Supabase Setup
- [x] Create Supabase project
- [x] Run `supabase/schema.sql` — creates all tables
- [x] Run `supabase/rls.sql` — security policies
- [x] Run `supabase/functions.sql` — availability engine
- [x] Run `supabase/seed.sql` — sample Hotel Adriatic + Salon Bella

### Admin Panel — Local
- [ ] Get credentials from Supabase: **Project Settings → API**
      → Copy **Project URL** and **anon public key**
- [ ] `cd admin && cp .env.example .env`
- [ ] Fill in `.env` with your Supabase URL and anon key
- [ ] `npm install`
- [ ] `npm run dev` → opens at http://localhost:5173
- [ ] Test login with your email (magic link)
- [ ] Run SQL to link your user to a business (see step below)

### Link Owner to Business (run in Supabase SQL Editor)
```sql
-- Step 1: find your user ID after logging in
select id, email from auth.users;

-- Step 2: link to a business
insert into business_members (user_id, business_id, role)
values (
  'PASTE_YOUR_USER_ID_HERE',
  '11111111-0000-0000-0000-000000000001',  -- Hotel Adriatic (from seed)
  'owner'
);

-- For the salon:
-- '22222222-0000-0000-0000-000000000002'  -- Salon Bella
```

### Widget — Embed in CloudCart
- [ ] Host `widget/src/widget.js` on a static server
      → Easiest: upload to Cloudflare Pages (same or separate project)
      → Or use any CDN / static host
- [ ] In CloudCart page editor → add **Custom HTML block** → paste:

```html
<!-- Hotel example -->
<div
  data-cloudcart-booking
  data-business-id="11111111-0000-0000-0000-000000000001"
  data-supabase-url="https://YOUR_PROJECT.supabase.co"
  data-supabase-key="YOUR_ANON_KEY"
></div>
<script src="https://YOUR_HOST/widget.js"></script>

<!-- Salon example -->
<div
  data-cloudcart-booking
  data-business-id="22222222-0000-0000-0000-000000000002"
  data-supabase-url="https://YOUR_PROJECT.supabase.co"
  data-supabase-key="YOUR_ANON_KEY"
></div>
<script src="https://YOUR_HOST/widget.js"></script>
```

### Admin Panel — Deploy to Cloudflare Pages (do this last)
- [ ] Push entire project to a GitHub repository:
      ```bash
      git init
      git add .
      git commit -m "initial commit"
      git remote add origin https://github.com/YOUR_USERNAME/booking-system.git
      git push -u origin main
      ```
- [ ] Go to pages.cloudflare.com → Create project → Connect to Git
- [ ] Select your repo and configure:
      | Setting | Value |
      |---------|-------|
      | Root directory | `admin` |
      | Framework preset | Vite |
      | Build command | `npm run build` |
      | Build output directory | `dist` |
- [ ] Add environment variables:
      | Key | Value |
      |-----|-------|
      | `VITE_SUPABASE_URL` | your Supabase project URL |
      | `VITE_SUPABASE_ANON_KEY` | your Supabase anon key |
- [ ] Deploy → get public URL like `booking-admin.pages.dev`
- [ ] (Optional) Add custom domain in Cloudflare dashboard

---

## Setting Up on a New Machine

When you continue at home, you only need:

1. **Install Node.js** — download from nodejs.org (LTS version)
2. **Install Git** — download from git-scm.com
3. **Clone or copy the project** to your machine
4. **Get your Supabase credentials** — Project Settings → API
5. Run the admin panel locally:
   ```bash
   cd admin
   cp .env.example .env
   # fill in .env with your Supabase URL and anon key
   npm install
   npm run dev
   ```

The Supabase database is already set up in the cloud — you don't need to redo any of the SQL steps.

---

## Onboarding a Real Client (production flow)

1. Insert their business into the `businesses` table
2. Insert their rooms/staff into `resources`
3. Insert their services into `services`
4. Link resources to services in `resource_services`
5. Set up their weekly schedule in `availability_schedules`
6. Send them the magic link login for the admin panel
7. Run the `business_members` SQL to link their account
8. Give them the widget embed snippet for their CloudCart page

---

## Security Notes

- The **anon key** is safe to put in the widget — Supabase RLS policies
  ensure customers can only INSERT bookings, never read other people's data
- The **overlap constraint** on the `bookings` table prevents double-bookings
  at the database level — not just in the UI
- Owners authenticate via **magic link** — no passwords to manage
- Owners can only see data from their own business (enforced by RLS)

---

## Key Supabase IDs (seed data)

| Business | ID | Slug |
|----------|----|------|
| Hotel Adriatic | `11111111-0000-0000-0000-000000000001` | `hotel-adriatic` |
| Salon Bella | `22222222-0000-0000-0000-000000000002` | `salon-bella` |

| Resource | ID |
|----------|----|
| Standard Room | `aaaa0001-0000-0000-0000-000000000001` |
| Deluxe Room | `aaaa0002-0000-0000-0000-000000000001` |
| Suite | `aaaa0003-0000-0000-0000-000000000001` |
| Ana Kovač (stylist) | `cccc0001-0000-0000-0000-000000000002` |
| Marko Perić (barber) | `cccc0002-0000-0000-0000-000000000002` |
