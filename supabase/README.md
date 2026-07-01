# Supabase — Atlas schema & seed

Apply the migrations in filename order, then the seed.

## Migrations
1. `migrations/20260701000001_init_schema.sql` — extensions + 8 tables
2. `migrations/20260701000002_rls.sql` — RLS enabled + owner-only policies
3. `migrations/20260701000003_triggers_indexes.sql` — `updated_at` triggers + indexes
4. `migrations/20260701000004_workout_focus.sql` — nullable `workouts.focus` (session intent)
5. `migrations/20260701000005_workout_lifecycle.sql` — `workouts.finished_at` + one-active
   guard; `workout_exercises` (the ordered, statused plan queue) with RLS + `updated_at` trigger
6. `migrations/20260701000006_exercise_tier.sql` — `exercises.tier` (primary/accessory) +
   backfill of the 45 seeded rows (Picker groups Main lifts above Accessories)
7. `migrations/20260701000007_exercise_muscle.sql` — `exercises.muscle` (primary mover) +
   backfill of the 45 seeded rows (suggestion engine's muscle-gap signal, §7.3)
8. `migrations/20260701000008_whoop_connection.sql` — `whoop_connection` OAuth token store
   (one row/user, owner-only RLS + `updated_at` trigger; service-role access for background jobs)

## Seed
- `seed.sql` — 45 exercises with aliases.
- **Prerequisite:** the single user must have signed in at least once (a row in
  `auth.users`). The seed assigns the library to the earliest-created user and
  upserts on `(user_id, name)`, so it is safe to re-run.

## How to apply

**Supabase CLI (local or linked project)**
```bash
supabase db reset          # local: runs migrations + seed.sql
# or against a linked project:
supabase db push           # applies migrations
psql "$DATABASE_URL" -f supabase/seed.sql
```

**Supabase dashboard / MCP**
- Run each migration file's SQL (in order) via the SQL Editor or the
  `apply_migration` MCP tool, then run `seed.sql` after the first sign-in.

## App configuration
Copy `.env.example` → `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` from Project Settings → API. Enable the **Email**
auth provider (magic link) and add `<app-origin>/auth/callback` to the allowed
redirect URLs.
