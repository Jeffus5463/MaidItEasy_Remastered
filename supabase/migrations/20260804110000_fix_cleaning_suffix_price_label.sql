-- MaidItEasy — fix stale services.suffix/price_label for Home Cleaning (Phase 7)
--
-- Home Cleaning switched to per-hour pricing in Phase 4
-- (*_hourly_booking_schema.sql), but that migration never updated
-- suffix/price_label — they were still the original Phase 0 seed values
-- from before hourly_rate/pricing_model existed
-- (*_init_schema.sql: suffix='', price_label='Starting at'). This was
-- invisible until now because the Expo app read a hardcoded static object
-- instead of these DB columns; wiring the app to live services data
-- (this phase, see src/lib/services.ts) would otherwise regress the
-- customer-facing copy from "₱399/hr" to a bare "from ₱399".
--
-- Idempotent: safe to run this whole file again.

update public.services
set suffix = '/hr', price_label = 'Per hour'
where id = 'cleaning' and pricing_model = 'per_hour';
