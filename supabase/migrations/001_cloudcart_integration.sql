-- ============================================================
-- Migration 001: CloudCart integration fields
-- Run in Supabase SQL Editor
-- ============================================================

-- bookings: store the CloudCart order ID when payment completes
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS cloudcart_order_id text,
  ADD COLUMN IF NOT EXISTS cloudcart_order_status text;

CREATE INDEX IF NOT EXISTS idx_bookings_cloudcart_order
  ON bookings(cloudcart_order_id)
  WHERE cloudcart_order_id IS NOT NULL;

-- services: each service maps to a CloudCart product variant
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS cloudcart_variant_id bigint;

-- resources: rooms can also map to a variant (for future use)
ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS cloudcart_variant_id bigint;
