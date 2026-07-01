# Supabase — Atlas schema & seed

Apply the migrations in filename order, then the seed.

## Migrations
1. `migrations/20260701000001_init_schema.sql` — extensions + 8 tables
2. `migrations/20260701000002_rls.sql` — RLS enabled + owner-only policies
3. `migrations/20260701000003_triggers_indexes.sql` — `updated_at` triggers + indexes

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
