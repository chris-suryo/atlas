@AGENTS.md

# Atlas

Personal, iPhone-first fitness coaching PWA for a single user (Chris).
Next.js (App Router) + TypeScript + Tailwind v4 + Supabase (Auth + Postgres).

## Process (important)
Build in small, reviewable steps. Two hard review gates:
1. **Schema gate** — before migrations. ✅ done (approved).
2. **Parser gate** — propose the natural-language parser rules and STOP before
   coding the Log parser. ⛔ NOT yet passed — do not build the NL parser / Log
   screen until these rules are reviewed.

Full plan: `/root/.claude/plans/project-atlas-a-sparkling-newt.md`.

## Milestone 1 status
- ✅ Scaffold: PWA (manifest + icons), bottom tab nav (Today · Log · Trends),
  magic-link auth, Supabase clients + session proxy.
- ✅ Schema + seed authored in `supabase/` (not yet applied to a live project).
- ⛔ Log screen (NL front door + sets grid + RUN form) — after the parser gate.
- Today/Trends are placeholders this milestone.

## Stack gotchas
- **Next.js 16**: middleware is renamed **Proxy** — session refresh lives in
  `src/proxy.ts` (exports `proxy` + `config`), not `middleware.ts`.
- **Tailwind v4**: CSS-first config. Theme tokens (colors, fonts) are in
  `src/app/globals.css` under `@theme` — there is no `tailwind.config.js`.
- **Supabase SSR**: `src/lib/supabase/{client,server,session}.ts`. Server client
  returns `null` when env is unset so builds/renders don't crash.
- System font stack (no `next/font`) to avoid a build-time network fetch.
- Dark theme only; iPhone safe-area insets handled in layout + nav.

## Data model
8 tables, all with `user_id` + RLS owner-only policies and `updated_at`
(moddatetime) triggers: `exercises`, `workouts`, `workout_sets`, `runs`,
`body_metrics`, `ankle_logs`, `goals`, `recovery` (stub). Explicit unit columns
only. See `supabase/README.md`.

## Commands
```bash
npm run dev            # local dev (needs .env.local — see .env.example)
npm run build          # production build (passes without env)
npm run lint
node scripts/generate-icons.mjs   # regenerate PWA icons
```
