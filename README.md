# Atlas

Personal, iPhone-first fitness coaching PWA for a single user. Log lifts and
runs by tapping a custom keypad or typing gym shorthand, and see your last
session and progression inline. Next.js 16 (App Router) · TypeScript ·
Tailwind v4 · Supabase (Auth + Postgres).

> **Milestone 1** — scaffold, schema + seed, natural-language parser, and the
> Log screen (keypad + composer). Today and Trends are placeholders.

## Features (Milestone 1)

- **Installable PWA** — manifest + iOS icons, dark warm theme, safe-area aware.
- **Magic-link auth** (Supabase), single user, Row-Level Security owner-only.
- **Log screen** (design system §6–§7):
  - Tap a number → custom **numeric keypad**; **Log set** auto-advances.
  - **Natural-language composer** — `incline db 60x10x3 @8` → structured sets.
    Unknown names are created on the fly; ambiguous shorthand offers a chooser.
  - Inline **`last: W×R×S`** and live **progression vs. last session**.
  - **Rest timer** (auto-starts on a logged set) and rule-based **Up next**.
- **Runs** — minimal manual form (WHOOP fills the objective fields in a later phase).

## Getting started

```bash
cp .env.example .env.local   # add your Supabase URL + anon key
npm install
npm run dev                  # http://localhost:3000
```

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build (passes without env) |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (parser suite) |
| `node scripts/generate-icons.mjs` | Regenerate PWA icons |

## Architecture

```
src/
  app/
    (app)/{today,log,trends}/   tab screens (auth-guarded, force-dynamic)
    (auth)/login/               magic-link sign-in
    auth/{callback,signout}/    PKCE callback + sign out
    layout.tsx                  fonts, metadata, viewport
  components/
    BottomNav.tsx               borderless tab bar
    log/{NumericKeypad,SetComposer}.tsx
  lib/
    parser/                     pure NL set parser (unit-tested)
    data/log.ts                 exercises + history (last + frequency)
    supabase/{client,server,session}.ts
  proxy.ts                      Next 16 "Proxy" (session refresh)
supabase/                       migrations + seed + README
docs/design/                    design system (source of truth for UI)
```

- **Next.js 16 gotcha:** middleware is renamed **Proxy** — `src/proxy.ts`.
- **Tailwind v4:** CSS-first tokens in `src/app/globals.css` `@theme`; components
  reference token utilities only (`bg-bg`, `text-accent`, …), never raw hex.

## Database

Eight tables (`exercises`, `workouts`, `workout_sets`, `runs`, `body_metrics`,
`ankle_logs`, `goals`, `recovery`), each with `user_id`, owner-only RLS, and an
`updated_at` (moddatetime) trigger. Apply order and seed notes: `supabase/README.md`.
The seed (45 Planet-Fitness-aware exercises with aliases) runs **after the first
sign-in**, since it assigns the library to your account.

## Design system

`docs/design/ATLAS-DESIGN-SYSTEM.md` is the source of truth for how Atlas looks
and behaves; `docs/design/atlas-theme.css` holds the tokens. Re-theme by editing
the tokens — components never hardcode values.
