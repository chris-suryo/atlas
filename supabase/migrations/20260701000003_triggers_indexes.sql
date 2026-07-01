-- Auto-touch updated_at on every user-entered table, plus read-path indexes.
-- `create or replace trigger` (PG14+) keeps this migration idempotent.

create or replace trigger set_updated_at before update on public.exercises
  for each row execute function extensions.moddatetime(updated_at);
create or replace trigger set_updated_at before update on public.workouts
  for each row execute function extensions.moddatetime(updated_at);
create or replace trigger set_updated_at before update on public.workout_sets
  for each row execute function extensions.moddatetime(updated_at);
create or replace trigger set_updated_at before update on public.runs
  for each row execute function extensions.moddatetime(updated_at);
create or replace trigger set_updated_at before update on public.body_metrics
  for each row execute function extensions.moddatetime(updated_at);
create or replace trigger set_updated_at before update on public.ankle_logs
  for each row execute function extensions.moddatetime(updated_at);
create or replace trigger set_updated_at before update on public.goals
  for each row execute function extensions.moddatetime(updated_at);
create or replace trigger set_updated_at before update on public.recovery
  for each row execute function extensions.moddatetime(updated_at);

-- Indexes -----------------------------------------------------------------
-- "last: W×R×S" lookup: most-recent sets for an exercise, joined to workout date.
create index if not exists exercises_user_idx        on public.exercises (user_id);
create index if not exists workouts_user_date_idx     on public.workouts (user_id, date desc);
create index if not exists workout_sets_user_ex_idx   on public.workout_sets (user_id, exercise_id);
create index if not exists workout_sets_workout_idx   on public.workout_sets (workout_id);
create index if not exists runs_workout_idx           on public.runs (workout_id);
create index if not exists body_metrics_user_date_idx on public.body_metrics (user_id, date desc);
create index if not exists ankle_logs_user_date_idx   on public.ankle_logs (user_id, date desc);
