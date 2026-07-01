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
- Today/Trends are placeholders this milestone.

## Stack gotchas
- **Next.js 16**: middleware is renamed **Proxy** — `src/proxy.ts` (exports `proxy` + `config`).
- **Tailwind v4**: CSS-first; theme tokens in `src/app/globals.css` `@theme` (no `tailwind.config.js`).
- **Supabase SSR**: `src/lib/supabase/{client,server,session}.ts`; server client returns
  `null` when env is unset so builds/renders don't crash.
- **Space Grotesk** via `next/font/google` in `layout.tsx`, exposed as
  `--font-space-grotesk` → `--font-display`. Icons: `@tabler/icons-react`.
- Dark theme only; iPhone safe-area insets respected.

## Data model
9 tables, all with `user_id` + owner-only RLS and `updated_at` (moddatetime) triggers:
`exercises`, `workouts`, `workout_sets`, `runs`, `body_metrics`, `ankle_logs`, `goals`,
`recovery` (stub; the future WHOOP sink), `workout_exercises` (the plan queue). See
`supabase/README.md`.
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

## Commands
```bash
npm run dev            # local dev (needs .env.local — see .env.example)
npm run build          # production build (passes without env)
npm run lint
npm run test           # vitest (parser)
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
