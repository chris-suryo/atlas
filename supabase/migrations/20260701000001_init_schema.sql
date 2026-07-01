-- Atlas — Milestone 1 core schema.
-- Conventions: uuid PKs; text + CHECK enums; user_id defaults to auth.uid();
-- created_at/updated_at on every user-entered table (moddatetime trigger added
-- in 20260701000003). Explicit unit columns only (weight_lbs, distance_miles,
-- pace_min_per_mile, elevation_gain_ft, duration_sec).

-- Extensions --------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;    -- gen_random_uuid()
create extension if not exists moddatetime with schema extensions; -- updated_at trigger

-- exercises ---------------------------------------------------------------
create table if not exists public.exercises (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name         text not null,
  category     text not null check (category in ('push','pull','legs','core','cardio','mobility')),
  equipment    text not null check (equipment in ('machine','smith','dumbbell','cable','bodyweight','functional','band')),
  is_anchor    boolean not null default false,
  aliases      text[] not null default '{}',          -- stored lowercased, for shorthand parsing
  default_unit text not null default 'lbs' check (default_unit in ('lbs','bodyweight','time','band')),
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, name)
);

-- workouts ----------------------------------------------------------------
create table if not exists public.workouts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date             date not null default current_date, -- app supplies the user's LOCAL date
  started_at       timestamptz,
  type             text not null check (type in ('strength','easy_run','quality_run','long_run','cycling','mtb','golf','mobility')),
  perceived_effort smallint check (perceived_effort between 1 and 10), -- RPE; run overall effort lives here too
  notes            text,
  source           text not null default 'manual',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- workout_sets ------------------------------------------------------------
create table if not exists public.workout_sets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workout_id   uuid not null references public.workouts (id) on delete cascade,
  exercise_id  uuid not null references public.exercises (id) on delete restrict, -- protect history
  weight_lbs   numeric(6,2),                 -- null for bodyweight
  reps         smallint,
  rpe          smallint check (rpe between 1 and 10),
  set_index    smallint not null default 0,  -- ordering within (workout, exercise)
  duration_sec integer,                       -- future-proof for time-based holds; not wired in M1 grid
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- runs (1:1 with a run-type workout) -------------------------------------
create table if not exists public.runs (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workout_id             uuid not null unique references public.workouts (id) on delete cascade,
  distance_miles         numeric(6,2),
  duration_sec           integer,
  pace_min_per_mile      numeric(6,2),        -- app computes from distance+duration; editable (treadmill)
  avg_hr                 smallint check (avg_hr between 0 and 250),
  max_hr                 smallint check (max_hr between 0 and 250),
  elevation_gain_ft      numeric(7,1),
  ankle_pain_0_10        smallint check (ankle_pain_0_10 between 0 and 10),
  lateral_tightness_0_10 smallint check (lateral_tightness_0_10 between 0 and 10),
  symptom_trend          text check (symptom_trend in ('worse','same','better')),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- body_metrics ------------------------------------------------------------
create table if not exists public.body_metrics (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date       date not null default current_date,
  weight_lbs numeric(6,2),
  source     text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

-- ankle_logs --------------------------------------------------------------
create table if not exists public.ankle_logs (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date                date not null default current_date,
  did_durability_work boolean not null default false,
  pain_0_10           smallint check (pain_0_10 between 0 and 10),
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, date)
);

-- goals -------------------------------------------------------------------
create table if not exists public.goals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type       text not null check (type in ('weight','half_marathon','strength','ankle')),
  metric     text,      -- e.g. 'finish_time_sec', 'bodyweight_lbs'
  target     numeric,
  deadline   date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- recovery (STUB — created but unused in Milestone 1) --------------------
create table if not exists public.recovery (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date         date not null default current_date,
  recovery_pct numeric(5,2),
  hrv          numeric(6,2),
  rhr          smallint,
  sleep_hours  numeric(4,2),
  sleep_perf   numeric(5,2),
  strain       numeric(5,2),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, date)
);
