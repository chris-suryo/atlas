-- Add the session focus (which "day" a workout was) to workouts.
-- Nullable so existing rows are untouched; the app sets it on workout creation.
-- Records training intent so Trends can later show balance-over-time — intent
-- can't be backfilled, so we capture it now. Values per design §7.5, plus
-- 'anything' (a stored freeform focus, distinct from NULL = not set).
alter table public.workouts
  add column if not exists focus text
    check (focus in ('push','pull','legs','core','mobility','run','anything'));
