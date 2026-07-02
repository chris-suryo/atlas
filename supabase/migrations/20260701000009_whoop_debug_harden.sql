-- whoop_debug is a scratch diagnostic table (created ad hoc via the SQL tool
-- while debugging the WHOOP OAuth connect flow) — not part of the product
-- schema, no user_id, no FK relationships. This migration retroactively
-- documents its shape and closes the RLS gap: its original policy granted
-- `for all to authenticated using (true)`, so any authenticated user could
-- read/write any row. It carries no secrets (only booleans, HTTP statuses,
-- WHOOP's own error text, and counts), but it should never have been
-- client-readable. Only `src/lib/supabase/admin.ts` (service-role, which
-- bypasses RLS) ever needs to touch it, matching whoop_connection's posture
-- for sensitive operational data.
create table if not exists public.whoop_debug (
  id      bigint generated always as identity primary key,
  at      timestamptz not null default now(),
  outcome text,
  detail  text
);

alter table public.whoop_debug enable row level security;

drop policy if exists dbg_all on public.whoop_debug;
-- No replacement policy: RLS enabled + zero policies denies all access to
-- `authenticated`/`anon`; `service_role` bypasses RLS entirely.
