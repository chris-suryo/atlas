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
  most-used-first, anchors diamond-marked, `last: W×R×S`, one gap-aware "suggested" pinned)
  → **Session** with a `Plan | Now` segmented toggle. The §6 keypad/rest-timer/progression/
  Up-next are **re-hosted inside "Now"** — reused, not rewritten. Plan = reorderable queue
  (queued/now/done) + `+ Add` + quiet Finish (→ recap). Plan/Now lives inside the Log tab;
  global nav stays Today·Log·Trends.
  - **M1 core:** Focus → Picker → Session[Now] keypad → save + inline "last: W×R×S".
  - **Fast-follow:** rest timer, "Up next" suggestions (§7.3), drag-to-reorder.
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
8 tables, all with `user_id` + owner-only RLS and `updated_at` (moddatetime) triggers:
`exercises`, `workouts`, `workout_sets`, `runs`, `body_metrics`, `ankle_logs`, `goals`,
`recovery` (stub; the future WHOOP sink). See `supabase/README.md`.
- **`workouts.focus`** (nullable `push|pull|legs|core|mobility|run|anything`) records the
  session's intent for Trends balance-over-time; set on workout creation. Migration
  `20260701000004_workout_focus.sql` (`anything` = stored freeform, distinct from NULL).

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
