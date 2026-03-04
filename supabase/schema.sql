-- ============================================================
-- CloudCart Booking System — Supabase Schema
-- Multi-tenant: supports hotels and hair salons
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists btree_gist;

-- ============================================================
-- BUSINESSES
-- ============================================================
create table businesses (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  type        text not null check (type in ('hotel', 'salon')),
  slug        text unique not null,  -- used in widget embed
  email       text,
  phone       text,
  address     text,
  timezone    text not null default 'UTC',
  settings    jsonb default '{}',   -- future: currency, locale, etc.
  created_at  timestamptz default now()
);

-- ============================================================
-- BUSINESS MEMBERS (owners / staff with admin access)
-- ============================================================
create table business_members (
  user_id     uuid references auth.users(id) on delete cascade,
  business_id uuid references businesses(id) on delete cascade,
  role        text not null default 'owner' check (role in ('owner', 'staff')),
  primary key (user_id, business_id)
);

-- ============================================================
-- RESOURCES
-- Hotels  → rooms
-- Salons  → staff members / chairs
-- ============================================================
create table resources (
  id          uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  name        text not null,
  type        text not null check (type in ('room', 'staff')),
  description text,
  capacity    integer,              -- rooms: max guests; staff: null
  images      jsonb default '[]',   -- array of image URLs
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- ============================================================
-- SERVICES
-- Hotels  → room packages / rate plans (duration_minutes = null)
-- Salons  → haircut, coloring, etc. (duration_minutes required)
-- ============================================================
create table services (
  id                uuid primary key default uuid_generate_v4(),
  business_id       uuid references businesses(id) on delete cascade not null,
  name              text not null,
  description       text,
  duration_minutes  integer,        -- null for hotels
  price             numeric(10, 2),
  currency          text default 'EUR',
  is_active         boolean default true,
  created_at        timestamptz default now()
);

-- ============================================================
-- RESOURCE ↔ SERVICE (which staff does which service)
-- Hotels: room linked to its own service/rate plan
-- Salons: staff member linked to services they provide
-- ============================================================
create table resource_services (
  resource_id  uuid references resources(id) on delete cascade,
  service_id   uuid references services(id) on delete cascade,
  primary key (resource_id, service_id)
);

-- ============================================================
-- AVAILABILITY SCHEDULES
-- Defines weekly recurring working hours per resource
-- day_of_week: 0=Sun, 1=Mon ... 6=Sat
-- ============================================================
create table availability_schedules (
  id           uuid primary key default uuid_generate_v4(),
  resource_id  uuid references resources(id) on delete cascade not null,
  day_of_week  integer not null check (day_of_week between 0 and 6),
  start_time   time not null,
  end_time     time not null,
  is_active    boolean default true
);

-- ============================================================
-- BLOCKED PERIODS
-- Manual blocks: vacations, maintenance, public holidays, etc.
-- ============================================================
create table blocked_periods (
  id              uuid primary key default uuid_generate_v4(),
  resource_id     uuid references resources(id) on delete cascade not null,
  start_datetime  timestamptz not null,
  end_datetime    timestamptz not null,
  reason          text,
  created_at      timestamptz default now()
);

-- ============================================================
-- BOOKINGS (unified for hotels and salons)
--
-- Hotels:  start_datetime = check-in date (midnight)
--          end_datetime   = check-out date (midnight)
--          guests         = number of guests
--          service_id     = null (or rate plan)
--
-- Salons:  start_datetime = appointment start
--          end_datetime   = start + service.duration_minutes
--          guests         = null
--          service_id     = required
-- ============================================================
create table bookings (
  id              uuid primary key default uuid_generate_v4(),
  business_id     uuid references businesses(id) on delete cascade not null,
  resource_id     uuid references resources(id) not null,
  service_id      uuid references services(id),

  -- Customer
  customer_name   text not null,
  customer_email  text not null,
  customer_phone  text,

  -- Timing
  start_datetime  timestamptz not null,
  end_datetime    timestamptz not null,

  -- Hotel-specific
  guests          integer,

  -- Status
  status          text not null default 'pending'
                    check (status in ('pending', 'confirmed', 'cancelled')),
  notes           text,
  created_at      timestamptz default now(),

  -- Prevent overlapping bookings for the same resource
  constraint no_overlap exclude using gist (
    resource_id with =,
    tstzrange(start_datetime, end_datetime, '[)') with &&
  ) where (status != 'cancelled')
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_bookings_business     on bookings(business_id);
create index idx_bookings_resource     on bookings(resource_id);
create index idx_bookings_dates        on bookings(start_datetime, end_datetime);
create index idx_bookings_status       on bookings(status);
create index idx_resources_business    on resources(business_id);
create index idx_services_business     on services(business_id);
create index idx_blocked_resource      on blocked_periods(resource_id);
create index idx_schedule_resource     on availability_schedules(resource_id);
