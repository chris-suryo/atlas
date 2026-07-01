-- WHOOP OAuth token store (ingest spec §2). One row per user; holds secrets, so
-- owner-only RLS + service-role for all background jobs. The rotating refresh
-- token lives here (WHOOP issues a new one on every refresh). The `recovery`
-- table is reused as-is for the ingested data (no schema change there).
create table if not exists public.whoop_connection (
  user_id        uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  whoop_user_id  bigint,
  access_token   text not null,
  refresh_token  text not null,
  expires_at     timestamptz not null,
  scope          text,
  last_synced_at timestamptz,
  connected_at   timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.whoop_connection enable row level security;
create policy owner_all on public.whoop_connection for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace trigger set_updated_at before update on public.whoop_connection
  for each row execute function extensions.moddatetime(updated_at);
