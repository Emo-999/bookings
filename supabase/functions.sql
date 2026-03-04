-- ============================================================
-- Availability Engine — Supabase RPC Functions
-- Called client-side via supabase.rpc()
-- ============================================================

-- ============================================================
-- SALON: get available time slots for a resource on a given date
--
-- Returns array of { slot_start, slot_end, available }
-- Usage: supabase.rpc('get_available_slots', {
--   p_resource_id, p_service_id, p_date
-- })
-- ============================================================
create or replace function get_available_slots(
  p_resource_id  uuid,
  p_service_id   uuid,
  p_date         date
)
returns table (
  slot_start  timestamptz,
  slot_end    timestamptz
)
language plpgsql security definer as $$
declare
  v_duration     integer;
  v_day_of_week  integer;
  v_schedule     record;
  v_slot_start   timestamptz;
  v_slot_end     timestamptz;
  v_day_start    timestamptz;
  v_day_end      timestamptz;
  v_tz           text;
begin
  -- Get service duration
  select duration_minutes into v_duration
  from services where id = p_service_id;

  if v_duration is null then
    raise exception 'Service not found or has no duration';
  end if;

  -- Get business timezone
  select b.timezone into v_tz
  from resources r
  join businesses b on b.id = r.business_id
  where r.id = p_resource_id;

  -- Day of week (0=Sun ... 6=Sat)
  v_day_of_week := extract(dow from p_date);

  -- Get working hours for this day
  select * into v_schedule
  from availability_schedules
  where resource_id = p_resource_id
    and day_of_week = v_day_of_week
    and is_active = true
  limit 1;

  -- No schedule = not working that day
  if not found then
    return;
  end if;

  -- Build day boundaries in business timezone
  v_day_start := (p_date || ' ' || v_schedule.start_time)::timestamp
                  at time zone v_tz;
  v_day_end   := (p_date || ' ' || v_schedule.end_time)::timestamp
                  at time zone v_tz;

  -- Generate slots every [duration] minutes
  v_slot_start := v_day_start;
  loop
    v_slot_end := v_slot_start + (v_duration || ' minutes')::interval;
    exit when v_slot_end > v_day_end;

    -- Check: no confirmed/pending booking overlaps this slot
    -- Check: no blocked period overlaps this slot
    if not exists (
      select 1 from bookings
      where resource_id = p_resource_id
        and status != 'cancelled'
        and tstzrange(start_datetime, end_datetime, '[)')
            && tstzrange(v_slot_start, v_slot_end, '[)')
    )
    and not exists (
      select 1 from blocked_periods
      where resource_id = p_resource_id
        and tstzrange(start_datetime, end_datetime, '[)')
            && tstzrange(v_slot_start, v_slot_end, '[)')
    )
    then
      slot_start := v_slot_start;
      slot_end   := v_slot_end;
      return next;
    end if;

    v_slot_start := v_slot_start + (v_duration || ' minutes')::interval;
  end loop;
end;
$$;

-- ============================================================
-- HOTEL: get available rooms for a date range
--
-- Returns resources that have no conflicting bookings
-- and are not blocked for the entire requested period.
-- Usage: supabase.rpc('get_available_rooms', {
--   p_business_id, p_check_in, p_check_out, p_guests
-- })
-- ============================================================
create or replace function get_available_rooms(
  p_business_id  uuid,
  p_check_in     date,
  p_check_out    date,
  p_guests       integer default 1
)
returns table (
  id           uuid,
  name         text,
  description  text,
  capacity     integer,
  images       jsonb
)
language sql security definer as $$
  select
    r.id,
    r.name,
    r.description,
    r.capacity,
    r.images
  from resources r
  where r.business_id  = p_business_id
    and r.type         = 'room'
    and r.is_active    = true
    and r.capacity     >= p_guests
    -- No overlapping confirmed/pending booking
    and not exists (
      select 1 from bookings b
      where b.resource_id = r.id
        and b.status != 'cancelled'
        and tstzrange(b.start_datetime, b.end_datetime, '[)')
            && tstzrange(
              p_check_in::timestamptz,
              p_check_out::timestamptz,
              '[)'
            )
    )
    -- No blocked period covering any part of the stay
    and not exists (
      select 1 from blocked_periods bp
      where bp.resource_id = r.id
        and tstzrange(bp.start_datetime, bp.end_datetime, '[)')
            && tstzrange(
              p_check_in::timestamptz,
              p_check_out::timestamptz,
              '[)'
            )
    )
  order by r.capacity asc;
$$;

-- ============================================================
-- HOTEL: get dates that are fully booked for a specific room
-- Used to disable dates in the calendar
--
-- Usage: supabase.rpc('get_booked_dates', {
--   p_resource_id, p_month_start, p_month_end
-- })
-- ============================================================
create or replace function get_booked_dates(
  p_resource_id  uuid,
  p_month_start  date,
  p_month_end    date
)
returns table (booked_date date)
language sql security definer as $$
  select distinct d::date as booked_date
  from bookings b,
       generate_series(
         greatest(b.start_datetime::date, p_month_start),
         least(b.end_datetime::date - interval '1 day', p_month_end),
         '1 day'::interval
       ) d
  where b.resource_id = p_resource_id
    and b.status != 'cancelled'
    and b.start_datetime::date <= p_month_end
    and b.end_datetime::date   >= p_month_start

  union

  select distinct d::date as booked_date
  from blocked_periods bp,
       generate_series(
         greatest(bp.start_datetime::date, p_month_start),
         least(bp.end_datetime::date - interval '1 day', p_month_end),
         '1 day'::interval
       ) d
  where bp.resource_id = p_resource_id
    and bp.start_datetime::date <= p_month_end
    and bp.end_datetime::date   >= p_month_start;
$$;
