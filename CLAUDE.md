@AGENTS.md

# Atlas

Personal, iPhone-first fitness coaching PWA for a single user (Chris).
Next.js 16 (App Router) + TypeScript + Tailwind v4 + Supabase (Auth + Postgres).

## Design system (source of truth for UI)
`docs/design/ATLAS-DESIGN-SYSTEM.md` governs how Atlas looks and behaves and
**supersedes** earlier UI notes in the plan. Companion files in `docs/design/`:
`atlas-theme.css` (tokens) and `atlas-log-{list,keypad}-reference.html` (visual
ground truth). Read it before building any UI.
- **Tokens only — never hardcode a hex/font/radius in a component.** Tokens live in
  `src/app/globals.css` `@theme` (merged from atlas-theme.css): warm near-black bg
  `#131110`, bone text, one amber accent `#D2924A`. Utilities: `bg-bg`, `text-text`,
  `text-text-muted`, `text-text-faint`, `border-line`, `bg-accent`, `text-accent-ink`,
  `rounded-control`, `font-display`.
- Borderless, numbers-first, **one filled element per screen** (the primary action),
  two font weights (400/500), Space Grotesk via `next/font`.

## Process (gates)
1. **Schema gate** — ✅ approved & built.
2. **Parser gate** — ✅ approved. Parser logic ships as written (rules in the plan).
Full plan: `/root/.claude/plans/project-atlas-a-sparkling-newt.md`.

## Milestone 1 status
- ✅ Scaffold, schema (migrations applied), **email+password auth** with first-run
  auto-seed (`src/lib/actions/seed.ts`), PWA, design tokens + Space Grotesk.
- **Log tab = selection-first flow** (design **§7.5**, supersedes the composer-first
  landing & one-exercise model): **Focus** (Push·Pull·Legs·Core·Mobility / Run / Anything;
  neglected categories read "due" in amber) → **Picker** (search that also parses shorthand,
  grouped **Main lifts** (`tier=primary`) above **Accessories** (`tier=accessory`),
  most-used-first within each, anchors diamond-marked, `last: W×R×S`, one gap-aware "suggested" pinned)
  → **Session** with a `Plan | Now` segmented toggle. The §6 keypad/rest-timer/progression/
  Up-next are **re-hosted inside "Now"** — reused, not rewritten. Plan = reorderable queue
  (queued/now/done) + `+ Add` + quiet Finish (→ recap). Plan/Now lives inside the Log tab;
  global nav stays Today·Log·Trends.
  - **M1 core:** Focus → Picker → Session[Now] keypad → save + inline "last: W×R×S".
  - **Plan v2 (DB-persistent, plan-first):** the whole session lives in the DB, so it
    **resumes** after reload/app-switch. On Log load, an unfinished workout
    (`finished_at IS NULL`) opens straight into **Plan**; Focus shows only when none is
    active. `+ Add` **stays in Plan** (queue several before starting); rows **drag to
    reorder** (`@dnd-kit`, `order_index` persisted). **Start workout** stamps `started_at`
    → Now; **Finish exercise** flips `workout_exercises.status` → `done`; **Finish
    workout** stamps `finished_at` → recap → Today. Migration
    `20260701000005_workout_lifecycle.sql`.
  - **Fast-follow (done):** rest timer, drag-to-reorder (auto-scroll disabled so a drag
    moves the list, not the page). **Now refinements:** **keypad on-demand** (hidden by
    default; weight×reps carry over + tap a number to open it; Log set stays hidden) and a
    **per-set timer** (Start/Stop stopwatch → `workout_sets.duration_sec`, shown in the
    logged row — the col already existed, no migration).
  - **Suggestion engine (§7.3):** rule-based coach `src/lib/suggest/` (pure, Vitest) —
    `suggestNext` blends **gap ≫ preference** (tier phasing, muscle/anchor/category gaps,
    recency-decayed frequency), returns top 1–3 with a reason string. **Picker "Suggested"**
    pin + **Plan "Up next"** strip (`+` queues, plan-first). `recovery` param is the inert
    **WHOOP seam**. `getHistory` gains `categoryLoad` (10-day per-focus load).
- **Runs:** Focus **Run** row = "Import from WHOOP" (§7.6) — **routed to a minimal manual
  run form placeholder** until the WHOOP ingest session. Objective fields come from WHOOP's
  workout API (§7.4); subjective ankle fields stay manual. Spec:
  `docs/integrations/ATLAS-WHOOP-INGEST-SPEC.md` — **do not build WHOOP yet**.
- **Today (§7.7)** = glanceable dashboard + motivator (`src/app/(app)/today/page.tsx` →
  `src/components/today/`): **WHOOP rings** (Sleep·Recovery·Strain) + **recovery-vs-strain**
  render a **"Connect WHOOP" empty state** (recovery table empty until ingest — not zeros);
  **rule-based recommendation** (reuses §7.3 `suggestNext` with `focus="anything"`,
  `recovery=null`) + tappable alternates that pre-seed Log via `/log?focus=<focus>`; a
  **tappable 10-segment ankle ring** upserts `ankle_logs.pain_0_10` (one row/day) + rolling
  avg; **"Road to Cambridge"** weekly-mileage chart (`runs` bucketed weekly vs a dashed
  target) + race countdown. Race date + weekly target = `src/lib/config/running.ts` (no DB).
  **Fuel** is a static stub. All hand-rolled inline-SVG rings/charts, tokens only. `getHistory`
  is reused; `getWeeklyMileage`/`getRecoveryLatest`/`getAnkleRecent` in `src/lib/data/today.ts`.
- **WHOOP ingest (LIVE, §7.6/§7.7 unlock):** OAuth connect (`/api/whoop/authorize` → `/callback`,
  CSRF state cookie), **rotating-refresh** token store (`ensureValidToken` in `src/lib/whoop/token.ts`,
  compare-and-swap on the old refresh token), fetch+map recovery·sleep·cycle → the `recovery` table
  **anchored to the Boston-local date of the WHOOP cycle start** (`assembleRecoveryRows`, pure/tested;
  `src/lib/whoop/{api,sync}.ts`). Today rings + recovery-vs-strain trend go live from `recovery`; the
  §7.3 engine's `recovery` param is now the real score (readiness modifier on). Freshness = daily
  **Vercel Cron** `/api/cron/whoop` (guarded by `CRON_SECRET`, `vercel.json` `0 12 * * *`) + a manual
  **Sync** + **Disconnect** on Today. Tokens live in `whoop_connection` (service-role only, via
  `src/lib/supabase/admin.ts`). Public `/privacy` page. **Webhooks/run-import/body-weight = fast-follow.**
- Trends is a placeholder this milestone.
- **WHOOP MVP confirmed working + polish pass (2026-07-02):** rings, 14-day recovery-vs-strain
  trend, daily cron, and the readiness modifier all verified live against real WHOOP data.
  **Data completeness is real, not a bug** — some nights have cycle+strain but no scored
  recovery (insufficient sleep that night); confirmed via raw `whoop_debug` counts across 3
  syncs. Fixes from this pass: **Road to Cambridge** was empty because a run could silently
  fail to save (`RunForm.tsx` — blank-form taps now disabled via `canSave`; a thrown/rejected
  save now surfaces an error instead of leaving the button stuck) · **day tick labels** on the
  recovery-vs-strain chart (`RecoveryStrainTrend.tsx`) · **ankle logging** replaced the fiddly
  10-wedge tap with a tap-to-open 0–10 chip popover (`AnkleRing.tsx`, `bg-surface` per its
  "reserved for future" token comment) · **bottom-nav lag**: `loading.tsx` added to
  today/log/trends, and `ensureSeeded` no longer re-derives the user via its own
  `auth.getUser()` call — see request-memoized `getUser()` in `src/lib/supabase/server.ts`,
  shared with the `(app)` layout's own auth gate · nav `Link` gets a `min-h-11` tap target and
  the outer bar's dead padding is trimmed.
  **Hardening:** `whoop_debug` (scratch diagnostic table, ad hoc via SQL, not part of the
  10-table model below) had been left client-`authenticated`-readable — locked to
  service-role-only (migration `20260701000009_whoop_debug_harden.sql`); every sync write now
  tags `source=cron|manual|connect` so a stuck overnight cron leaves a distinguishable trace.
  Removed the temporary `/api/whoop/debug` env-check route (its job — verifying OAuth config
  during the connect-flow debugging — is done).
  **Playwright** (`tests/e2e/`, `npm run test:e2e`, needs `.env.test.local` — see
  `.env.example`) added for autonomous smoke-testing going forward: 5 core flows (sign-in,
  full Log workout, ankle picker, run form, sign-out) against a dedicated RLS-isolated test
  account. Authored and config-verified (typecheck/lint clean, portable `executablePath`
  fallback for pre-installed-Chromium containers) but **not run end-to-end** in the authoring
  session — that container's network policy blocked outbound access to both Supabase and the
  Vercel deployment, unrelated to app correctness.
  **Found, not fixed this pass:** no sign-out control exists anywhere in the UI
  (`/auth/signout` is POST-only and unlinked from any page); a few save flows (e.g.
  `NowView`'s `logSet`) don't await/handle their server-action call, the same shape of bug
  `RunForm` had — worth a systematic pass. **Backlog unchanged otherwise:** Trends tab, WHOOP
  webhooks/run-import/body-weight, ring detail pages, a full whole-app security/perf audit
  (this pass covered the two reported bugs plus the newest/highest-risk WHOOP surface, not
  everything).

## Stack gotchas
- **Next.js 16**: middleware is renamed **Proxy** — `src/proxy.ts` (exports `proxy` + `config`).
- **Tailwind v4**: CSS-first; theme tokens in `src/app/globals.css` `@theme` (no `tailwind.config.js`).
- **Supabase SSR**: `src/lib/supabase/{client,server,session}.ts`; server client returns
  `null` when env is unset so builds/renders don't crash.
- **Space Grotesk** via `next/font/google` in `layout.tsx`, exposed as
  `--font-space-grotesk` → `--font-display`. Icons: `@tabler/icons-react`.
- Dark theme only; iPhone safe-area insets respected.

## Data model
10 tables, all with `user_id` + owner-only RLS and `updated_at` (moddatetime) triggers:
`exercises`, `workouts`, `workout_sets`, `runs`, `body_metrics`, `ankle_logs`, `goals`,
`recovery` (the WHOOP sink — now fed by ingest), `workout_exercises` (the plan queue),
`whoop_connection` (OAuth tokens; service-role only). See `supabase/README.md`.
- **`workouts.focus`** (nullable `push|pull|legs|core|mobility|run|anything`) records the
  session's intent for Trends balance-over-time; set on workout creation. Migration
  `20260701000004_workout_focus.sql` (`anything` = stored freeform, distinct from NULL).
- **`workouts.finished_at`** (nullable) closes a session; NULL = in progress. A partial
  unique index on `(user_id) where finished_at is null` allows **one open workout** at a
  time (the resume anchor). `started_at` = when Start was tapped.
- **`workout_exercises`** = the ordered plan queue: `workout_id` (fk cascade), `exercise_id`
  (fk restrict), `order_index`, `status ∈ {queued,done}`. Sets stay in `workout_sets`
  keyed by `(workout_id, exercise_id)`. Migration `20260701000005_workout_lifecycle.sql`.
- **`exercises.tier`** (nullable `primary|accessory`) tiers a lift as compound/main vs
  isolation/complementary so the Picker groups **Main lifts** above **Accessories** (19
  primary · 26 accessory across the seed; anchors ⊂ primary). Migration
  `20260701000006_exercise_tier.sql`; also in `seed-data.ts`/`seed.sql`.
- **`exercises.muscle`** (nullable text; single primary mover, 14 buckets) powers the
  suggestion engine's muscle-gap signal. Migration `20260701000007_exercise_muscle.sql`;
  also in `seed-data.ts`/`seed.sql`.
- **`whoop_connection`** (`user_id` PK, `access_token`, `refresh_token`, `expires_at`,
  `scope`, `whoop_user_id`, `last_synced_at`, …) = WHOOP OAuth token store, one row/user.
  Owner-only RLS but **all access is via the service-role admin client** (tokens never reach
  the browser). Migration `20260701000008_whoop_connection.sql`.
- **`whoop_debug`** is *not* part of this product schema — a scratch diagnostic table
  (`id`, `at`, `outcome`, `detail`; no `user_id`, no RLS-scoped ownership) that every WHOOP
  route writes a free-text trace row to (booleans/statuses/counts only, never tokens).
  Service-role only. Migration `20260701000009_whoop_debug_harden.sql`.

## Commands
```bash
npm run dev            # local dev (needs .env.local — see .env.example)
npm run build          # production build (passes without env)
npm run lint
npm run test           # vitest (parser)
npm run test:e2e       # playwright smoke tests (needs .env.test.local, see .env.example)
node scripts/generate-icons.mjs   # regenerate PWA icons
```

## Live infrastructure (Milestone 1)
- **Supabase** project `atlas` — ref `bbzvpcaxqkwmhidyqmhu` (org jfishbowl-01,
  free plan, us-east-1). All 3 migrations applied; RLS verified. Public config
  (URL + anon key) is committed in `.env.production`. **Auth = email+password**
  with **email confirmation disabled** (signUp returns a session immediately).
  The 45-row library is planted by **first-run auto-seed** (`ensureSeeded`,
  idempotent) on sign-in / first Log load; `supabase/seed.sql` and
  `src/lib/data/seed-data.ts` hold the same rows.
- Freed a free-tier active slot by pausing **glenn-events** (`foscibergjhdwqkpsxip`);
  restore it anytime.
- **Deploy:** Vercel via GitHub repo import; set Production Branch to the feature
  branch. Live at https://atlas-puce-gamma.vercel.app. Email+password needs no
  redirect-URL config (Site URL only matters if magic links are re-enabled).
- **WHOOP (Vercel env, server-only, NOT committed):** `WHOOP_CLIENT_ID`,
  `WHOOP_CLIENT_SECRET`, `WHOOP_REDIRECT_URI` (=`…/api/whoop/callback`),
  `SUPABASE_SERVICE_ROLE_KEY`, and **`CRON_SECRET`** (guards `/api/cron/whoop`; Vercel sends it
  as `Authorization: Bearer …`). OAuth only works on the deployed URL (fixed redirect URI).
  Daily cron `0 12 * * *` UTC ≈ 8am ET (Hobby = daily only; drifts 1h across DST).
