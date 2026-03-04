-- ============================================================
-- Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
alter table businesses           enable row level security;
alter table business_members     enable row level security;
alter table resources            enable row level security;
alter table services             enable row level security;
alter table resource_services    enable row level security;
alter table availability_schedules enable row level security;
alter table blocked_periods      enable row level security;
alter table bookings             enable row level security;

-- ============================================================
-- Helper: check if the current user belongs to a business
-- ============================================================
create or replace function is_business_member(bid uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from business_members
    where user_id = auth.uid() and business_id = bid
  );
$$;

-- ============================================================
-- BUSINESSES
-- Public: read by slug (widget needs this)
-- Admin:  full access for members
-- ============================================================
create policy "Public can read businesses"
  on businesses for select
  using (true);

create policy "Members can update their business"
  on businesses for update
  using (is_business_member(id));

-- ============================================================
-- BUSINESS MEMBERS
-- Only members can see their own membership
-- ============================================================
create policy "Members can read own membership"
  on business_members for select
  using (user_id = auth.uid());

-- ============================================================
-- RESOURCES
-- Public: read active resources
-- Admin:  full CRUD for members of that business
-- ============================================================
create policy "Public can read active resources"
  on resources for select
  using (is_active = true);

create policy "Members can manage resources"
  on resources for all
  using (is_business_member(business_id));

-- ============================================================
-- SERVICES
-- ============================================================
create policy "Public can read active services"
  on services for select
  using (is_active = true);

create policy "Members can manage services"
  on services for all
  using (is_business_member(business_id));

-- ============================================================
-- RESOURCE_SERVICES
-- ============================================================
create policy "Public can read resource_services"
  on resource_services for select
  using (true);

create policy "Members can manage resource_services"
  on resource_services for all
  using (
    exists (
      select 1 from resources r
      where r.id = resource_id
      and is_business_member(r.business_id)
    )
  );

-- ============================================================
-- AVAILABILITY SCHEDULES
-- ============================================================
create policy "Public can read availability schedules"
  on availability_schedules for select
  using (is_active = true);

create policy "Members can manage schedules"
  on availability_schedules for all
  using (
    exists (
      select 1 from resources r
      where r.id = resource_id
      and is_business_member(r.business_id)
    )
  );

-- ============================================================
-- BLOCKED PERIODS
-- ============================================================
create policy "Public can read blocked periods"
  on blocked_periods for select
  using (true);

create policy "Members can manage blocked periods"
  on blocked_periods for all
  using (
    exists (
      select 1 from resources r
      where r.id = resource_id
      and is_business_member(r.business_id)
    )
  );

-- ============================================================
-- BOOKINGS
-- Public:  insert only (create a booking)
-- Customer: cannot read other customers' bookings
-- Admin:   full access to their business bookings
-- ============================================================
create policy "Public can create bookings"
  on bookings for insert
  with check (true);

create policy "Members can read their business bookings"
  on bookings for select
  using (is_business_member(business_id));

create policy "Members can update their business bookings"
  on bookings for update
  using (is_business_member(business_id));

create policy "Members can delete their business bookings"
  on bookings for delete
  using (is_business_member(business_id));
