-- Row-Level Security: owner-only access on every user-owned table.
-- A single FOR ALL policy per table — USING gates select/update/delete,
-- WITH CHECK gates insert/update. Owner = (auth.uid() = user_id).
-- Single-user today, but enabled now to avoid a painful retrofit later.

alter table public.exercises     enable row level security;
alter table public.workouts      enable row level security;
alter table public.workout_sets  enable row level security;
alter table public.runs          enable row level security;
alter table public.body_metrics  enable row level security;
alter table public.ankle_logs    enable row level security;
alter table public.goals         enable row level security;
alter table public.recovery      enable row level security;

create policy owner_all on public.exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy owner_all on public.workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy owner_all on public.workout_sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy owner_all on public.runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy owner_all on public.body_metrics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy owner_all on public.ankle_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy owner_all on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy owner_all on public.recovery
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
