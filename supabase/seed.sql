-- ============================================================
-- Seed data for local development / testing
-- ============================================================

-- Sample hotel
insert into businesses (id, name, type, slug, email, phone, address, timezone) values
  ('11111111-0000-0000-0000-000000000001',
   'Hotel Adriatic', 'hotel', 'hotel-adriatic',
   'info@hoteladriatic.com', '+385911234567',
   'Obala kralja Petra 1, Split, Croatia', 'Europe/Zagreb');

-- Sample salon
insert into businesses (id, name, type, slug, email, phone, address, timezone) values
  ('22222222-0000-0000-0000-000000000002',
   'Salon Bella', 'salon', 'salon-bella',
   'info@salonbella.com', '+385921234567',
   'Ilica 42, Zagreb, Croatia', 'Europe/Zagreb');

-- ============================================================
-- Hotel rooms
-- ============================================================
insert into resources (id, business_id, name, type, description, capacity) values
  ('aaaa0001-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
   'Standard Room', 'room', 'Comfortable room with sea view, 20m²', 2),
  ('aaaa0002-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
   'Deluxe Room', 'room', 'Spacious room with balcony and sea view, 35m²', 3),
  ('aaaa0003-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
   'Suite', 'room', 'Luxury suite with private terrace, 60m²', 4);

-- Hotel services (rate plans)
insert into services (id, business_id, name, description, price, currency) values
  ('bbbb0001-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
   'Room Only', 'Accommodation only, no meals included', 80.00, 'EUR'),
  ('bbbb0002-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
   'Bed & Breakfast', 'Accommodation with daily breakfast', 110.00, 'EUR'),
  ('bbbb0003-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
   'Half Board', 'Accommodation with breakfast and dinner', 145.00, 'EUR');

-- Hotel: all rooms available every day 00:00 - 23:59
-- (hotels don't use time slots, schedules just mark "open days")
insert into availability_schedules (resource_id, day_of_week, start_time, end_time) values
  ('aaaa0001-0000-0000-0000-000000000001', 0, '00:00', '23:59'),
  ('aaaa0001-0000-0000-0000-000000000001', 1, '00:00', '23:59'),
  ('aaaa0001-0000-0000-0000-000000000001', 2, '00:00', '23:59'),
  ('aaaa0001-0000-0000-0000-000000000001', 3, '00:00', '23:59'),
  ('aaaa0001-0000-0000-0000-000000000001', 4, '00:00', '23:59'),
  ('aaaa0001-0000-0000-0000-000000000001', 5, '00:00', '23:59'),
  ('aaaa0001-0000-0000-0000-000000000001', 6, '00:00', '23:59'),
  ('aaaa0002-0000-0000-0000-000000000001', 0, '00:00', '23:59'),
  ('aaaa0002-0000-0000-0000-000000000001', 1, '00:00', '23:59'),
  ('aaaa0002-0000-0000-0000-000000000001', 2, '00:00', '23:59'),
  ('aaaa0002-0000-0000-0000-000000000001', 3, '00:00', '23:59'),
  ('aaaa0002-0000-0000-0000-000000000001', 4, '00:00', '23:59'),
  ('aaaa0002-0000-0000-0000-000000000001', 5, '00:00', '23:59'),
  ('aaaa0002-0000-0000-0000-000000000001', 6, '00:00', '23:59'),
  ('aaaa0003-0000-0000-0000-000000000001', 0, '00:00', '23:59'),
  ('aaaa0003-0000-0000-0000-000000000001', 1, '00:00', '23:59'),
  ('aaaa0003-0000-0000-0000-000000000001', 2, '00:00', '23:59'),
  ('aaaa0003-0000-0000-0000-000000000001', 3, '00:00', '23:59'),
  ('aaaa0003-0000-0000-0000-000000000001', 4, '00:00', '23:59'),
  ('aaaa0003-0000-0000-0000-000000000001', 5, '00:00', '23:59'),
  ('aaaa0003-0000-0000-0000-000000000001', 6, '00:00', '23:59');

-- ============================================================
-- Salon staff
-- ============================================================
insert into resources (id, business_id, name, type, description) values
  ('cccc0001-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002',
   'Ana Kovač', 'staff', 'Senior stylist, specializes in coloring'),
  ('cccc0002-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002',
   'Marko Perić', 'staff', 'Barber and mens hair specialist');

-- Salon services
insert into services (id, business_id, name, description, duration_minutes, price, currency) values
  ('dddd0001-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002',
   'Haircut', 'Cut and blow dry', 45, 25.00, 'EUR'),
  ('dddd0002-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002',
   'Color & Highlights', 'Full color or highlights with toner', 120, 80.00, 'EUR'),
  ('dddd0003-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002',
   'Men''s Cut', 'Classic mens haircut with finishing', 30, 18.00, 'EUR'),
  ('dddd0004-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002',
   'Beard Trim', 'Beard shaping and trim', 20, 12.00, 'EUR');

-- Ana does haircut and color
insert into resource_services (resource_id, service_id) values
  ('cccc0001-0000-0000-0000-000000000002', 'dddd0001-0000-0000-0000-000000000002'),
  ('cccc0001-0000-0000-0000-000000000002', 'dddd0002-0000-0000-0000-000000000002');

-- Marko does mens cut and beard
insert into resource_services (resource_id, service_id) values
  ('cccc0002-0000-0000-0000-000000000002', 'dddd0003-0000-0000-0000-000000000002'),
  ('cccc0002-0000-0000-0000-000000000002', 'dddd0004-0000-0000-0000-000000000002');

-- Salon working hours: Mon-Sat 09:00-19:00
insert into availability_schedules (resource_id, day_of_week, start_time, end_time) values
  -- Ana: Mon-Sat
  ('cccc0001-0000-0000-0000-000000000002', 1, '09:00', '19:00'),
  ('cccc0001-0000-0000-0000-000000000002', 2, '09:00', '19:00'),
  ('cccc0001-0000-0000-0000-000000000002', 3, '09:00', '19:00'),
  ('cccc0001-0000-0000-0000-000000000002', 4, '09:00', '19:00'),
  ('cccc0001-0000-0000-0000-000000000002', 5, '09:00', '19:00'),
  ('cccc0001-0000-0000-0000-000000000002', 6, '09:00', '17:00'),
  -- Marko: Tue-Sat
  ('cccc0002-0000-0000-0000-000000000002', 2, '10:00', '19:00'),
  ('cccc0002-0000-0000-0000-000000000002', 3, '10:00', '19:00'),
  ('cccc0002-0000-0000-0000-000000000002', 4, '10:00', '19:00'),
  ('cccc0002-0000-0000-0000-000000000002', 5, '10:00', '19:00'),
  ('cccc0002-0000-0000-0000-000000000002', 6, '10:00', '17:00');
