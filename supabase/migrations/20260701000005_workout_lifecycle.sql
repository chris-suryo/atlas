-- Plan v2: persist the whole workout lifecycle so a session survives reload /
-- app-switch. (1) A close timestamp on workouts + a one-active-workout guard.
-- (2) workout_exercises: the ordered, statused plan queue (sets stay in
-- workout_sets, keyed by workout_id + exercise_id).

-- 1. Close timestamp + "only one open workout per user" guard ---------------
alter table public.workouts
  add column if not exists finished_at timestamptz;

-- Backfill: existing workouts predate the lifecycle model — treat them all as
-- closed so the one-active-workout guard below can be created (and so resume
-- doesn't reopen a historical session).
update public.workouts
  set finished_at = coalesce(started_at, created_at, now())
  where finished_at is null;

-- Partial unique index: at most one workout with finished_at IS NULL per user.
create unique index if not exists workouts_one_active_per_user_idx
  on public.workouts (user_id)
  where finished_at is null;

-- 2. The plan queue --------------------------------------------------------
create table if not exists public.workout_exercises (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) default auth.uid(),
  workout_id  uuid not null references public.workouts(id)  on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  order_index int  not null default 0,
  status      text not null default 'queued' check (status in ('queued','done')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists workout_exercises_workout_idx
  on public.workout_exercises (workout_id, order_index);
create index if not exists workout_exercises_user_idx
  on public.workout_exercises (user_id);

alter table public.workout_exercises enable row level security;
create policy owner_all on public.workout_exercises for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace trigger set_updated_at before update on public.workout_exercises
  for each row execute function extensions.moddatetime(updated_at);
