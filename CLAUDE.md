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
- ✅ Scaffold, schema + seed (authored under `supabase/`, not yet applied), magic-link
  auth, PWA, design tokens + Space Grotesk.
- **Log screen = keypad + list model** (design §6–§7), NOT ± steppers: tap a number →
  custom NumericKeypad; the NL composer ("say or type") is the alternate entry mode,
  driven by the parser.
  - **M1 core:** keypad entry + NL parser + save + inline "last: W×R×S".
  - **Fast-follow (not blocking first install):** rest timer, "Up next" suggestions (§7.3).
- **Runs:** keep the entry form **minimal**. WHOOP's workout API returns
  duration/HR/distance/elevation for GPS runs (design §7.4); only the subjective ankle
  fields (`ankle_pain_0_10`, `lateral_tightness_0_10`, `symptom_trend`) are the durable
  manual part. WHOOP run-import is an early Phase-1 item, not M1.
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
  (URL + anon key) is committed in `.env.production`. **`supabase/seed.sql` must be
  run after the first sign-in** (it needs the `auth.users` row to own the rows).
- Freed a free-tier active slot by pausing **glenn-events** (`foscibergjhdwqkpsxip`);
  restore it anytime.
- **Deploy:** Vercel via GitHub repo import; set Production Branch to the feature
  branch. Auth Site URL + redirect allow-list are configured in the Supabase
  dashboard (no MCP tool for that).
