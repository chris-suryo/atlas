# Atlas — Frontend Design System

**Version 1.0** · Covers the shared system + the **Log** screen.
Today and Trends specs will be appended as they're designed — this document is meant to grow.

This is the source of truth for how Atlas looks and behaves. Claude Code builds against it; you edit it when the design evolves. The companion files:

- `atlas-theme.css` — the design tokens (colors, type, spacing). **Change the look here.**
- `atlas-log-list-reference.html` — visual ground truth: Log screen, *list mode*.
- `atlas-log-keypad-reference.html` — visual ground truth: Log screen, *entry mode*.

Open the two HTML files in a browser to see and interact with the target. They are illustrative; where they and the tokens disagree, **the tokens win**.

---

## 0. What this supersedes (build alignment)

The Milestone 1 plan predates this design work. Where they conflict, **this document wins.** Specifically:

- **Log screen UI.** The plan's "editable sets grid with ± steppers" (Execution outline #5 and Parser §4 "fast-adjust: weight ±5, reps ±1") is **superseded**. The Log screen is the keypad + list model in §6–§7: tap a number → custom numeric keypad; one filled "Log set"; rest timer; "Up next" suggestions. There are no ± steppers.
- **The NL parser is still correct and approved** — it powers the "say or type" composer (§6.8), one of the two entry modes. Parser logic ships as planned; only the *grid/stepper UI* around it changes to the keypad.
- **Runs.** The plan's note that "WHOOP isn't the right source for run distance/pace/elevation" is **wrong** — see §7.4. Keep the M1 run form minimal.
- **Log entry point (v2, §7.5).** The composer-first Log landing is **superseded** by a selection-first flow: Focus → Picker → Session (with a `Plan | Now` toggle). The keypad, rest timer, progression, and "Up next" from §6–§7 are all **reused inside the Session's "Now" mode** — nothing there is thrown away; it's re-hosted. One-exercise-at-a-time is replaced by a reorderable session queue.

### M1 scope split (so the first build is testable fast)
- **M1 core (needed to test on phone):** Focus → Picker → Session queue → keypad entry (Now) + save + inline "last: W×R×S".
- **Fast-follow (right after, not blocking the first install):** rest timer, "Up next" suggestions (§7.3), drag-to-reorder in the queue.

---

## 1. How to use this package

**For Claude Code (building):**
1. Merge `atlas-theme.css` into `src/app/globals.css` (it's already Tailwind v4 `@theme`, matching the scaffold).
2. Load Space Grotesk with `next/font/google` and point `--font-display` at its variable (see §8).
3. Build each component to the anatomy + states in §6. Match the reference HTML for layout and rhythm.
4. Reference tokens only — never hardcode a hex, font, or radius in a component. This is what keeps re-theming a one-place edit.

**For future changes (you, later):**
- Recolor, re-type, or re-space by editing `atlas-theme.css` alone.
- Change *behavior* or *layout* by editing the relevant component spec in §6, then have Claude Code apply it.
- Add a screen by appending a new section under §7 — same structure.

---

## 2. Design principles

1. **Numbers first.** This is a performance app; the data is the hero. Weights, reps, and deltas are the largest, highest-contrast things on screen. Chrome recedes.
2. **Borderless.** No cards, no pills, no outlined buttons. Structure comes from whitespace and hairline dividers, not boxes. (The one exception is the single primary action — see §6.4.)
3. **One accent, earned.** Amber appears only where it means something: the anchor marker, a positive progression, the active field, the rest-timer fill, and the primary action. It is never decoration.
4. **One filled element per screen.** The primary action ("Log set") is the only filled/solid element. Everything else is text and hairlines. This gives the primary action unmistakable weight without clutter.
5. **Calm density.** Even vertical rhythm, generous side padding. Content is vertically centered in its region rather than crammed to the top.
6. **Two type weights only** — 400 and 500. Hierarchy comes from size and color, not from heavy weights.

---

## 3. Tokens (reference)

All defined in `atlas-theme.css`. Semantic names, so components read intent, not values.

| Token | Value | Role | Tailwind utility |
|---|---|---|---|
| `--color-bg` | `#131110` | App background (warm near-black) | `bg-bg` |
| `--color-surface` | `#1B1815` | Reserved elevated surface | `bg-surface` |
| `--color-text` | `#ECE5D9` | Primary text (warm bone) | `text-text` |
| `--color-text-muted` | `#948A7C` | Secondary text | `text-text-muted` |
| `--color-text-faint` | `#5C554B` | Tertiary / hints / inactive | `text-text-faint` |
| `--color-line` | `rgba(236,229,217,.09)` | Hairline dividers | `border-line` |
| `--color-accent` | `#D2924A` | Accent — progress, active, primary | `text-accent` / `bg-accent` |
| `--color-accent-ink` | `#2A1C08` | Text/icon on an accent fill | `text-accent-ink` |
| `--font-display` | Space Grotesk stack | All UI type | `font-display` |
| `--radius-control` | `12px` | Keys, primary button | `rounded-control` |
| `--space-screen-x` | `28px` | Screen side padding | — |
| `--space-section` | `26px` | Gap between major sections | — |

**To change the theme, edit these — that is the entire surface area for a re-skin.**

---

## 4. Typography

- **Family:** Space Grotesk everywhere (via `next/font`), tabular figures on (`font-feature-settings: "tnum"`).
- **Scale (Log screen):**
  - Hero numbers (weight/reps): **34–38px / 500**, letter-spacing `-0.5px`.
  - Exercise name: **19px / 500**.
  - Body / set rows / input: **14–15px / 400**.
  - Meta, labels, reasons, timers: **12–13px / 400**.
- **Case:** sentence case throughout. No ALL CAPS, no Title Case except proper nouns.
- **Color as hierarchy:** primary = `text`, supporting = `text-muted`, hints/inactive = `text-faint`.

---

## 5. Spacing & layout rhythm

- **Screen padding:** `--space-screen-x` (28px) left/right.
- **Section gap:** `--space-section` (26px) between major blocks (name → numbers → RPE → rest → sets → up next).
- **Hairline rows** (logged sets, Up next): `13px` vertical padding, `1px` top border in `--color-line`.
- **The current-set block is vertically centered** in the scrollable region — not pinned to the top — so the screen breathes and doesn't leave a void above the input.
- **iPhone 16 Pro target:** ~19.5:9. Respect safe-area insets top and bottom (`viewport-fit=cover` is already set); the Dynamic Island and home indicator are OS chrome, not app-drawn.

---

## 6. Components (anatomy · states · behavior)

These compose both screen modes in §7. Each is borderless unless noted.

### 6.1 SessionHeader
Context strip at top. Left: `Push · Mon 30 · 18:24` (session type · date · elapsed). Right: `5 sets · 4.8k lb` (running session totals). All `text-muted`/`text-faint`, 12px.

### 6.2 CurrentSet (the hero)
- **Anatomy:** row 1 = anchor diamond (if `is_anchor`) + exercise name + `Set N` (right, faint). Row 2 = big `weight` `lb` × `reps`. Row 3 = `RPE n · <progression>`.
- **Anchor diamond:** 7px accent square rotated 45°, only for anchor lifts.
- **The numbers are the control.** Tapping `weight` or `reps` makes it the active field and opens the NumericKeypad (§6.3). Active field renders in `accent`.
- **Progression line** (computed from history, not stored): compares the working set to the same exercise's last session.
  - beats last (more weight, or same weight + more reps) → `+2 reps vs last 60×8` in **accent**.
  - matches → `matched last 60×8` in `text-muted`.
  - below → `vs last 60×8` in `text-faint`.
  - This line is the payoff of the whole screen — keep it prominent.

### 6.3 NumericKeypad (custom, in-app)
- **Why custom:** faster than the iOS system keyboard for gym logging — big keys, no OS chrome, primary action attached.
- **Anatomy:** a label row (`Editing weight` / `Editing reps`, with the active field switchable by tapping the numbers in §6.2) + a voice toggle (mic) to drop back to the SetComposer; a 3-column grid `1–9`, then `.` `0` `⌫`; and the primary **Log set** button below.
- **Behavior:** digits append to the active field; `⌫` deletes; `.` allowed once. Keys are borderless with a subtle press highlight.
- Keys are ≥44px tall (52px in the reference) for thumb use.

### 6.4 PrimaryAction — "Log set"
- **The one filled element on the screen.** `bg-accent`, `text-accent-ink`, `rounded-control`, full-width within the keypad, 15px padding, 16px/500.
- On tap: commit the set → reset RestTimer to 0 → **auto-advance** to the next set with the keypad primed (fast multi-set logging). If the exercise's planned sets are done, collapse the keypad and surface Up next.

### 6.5 RestTimer
- **Anatomy:** clock icon · `Resting m:ss / target` · thin progress bar (fills toward target in `accent`) · `Skip` (text).
- **Behavior:** **auto-starts when a set is logged** (that's the trigger — no separate action). Counts up; the bar shows progress toward the target rest. `Skip` resets to 0. This directly answers "how does it know I finished a set" — logging *is* the finish.

### 6.6 LoggedSetRow
Hairline row: `Set N` (faint, fixed width) · `W × R` (muted) · `RPE n` (faint) · check (accent). Read-only history for the current exercise; tap to edit reopens the keypad on that set.

### 6.7 UpNextRow (suggestions)
- **Anatomy:** anchor diamond (if anchor) · exercise name (`text`) · reason (`text-faint`, ≤3 words) · add glyph (`+`).
- **Reason encodes the blend** (see §7.3): gap-driven (`balances push`, `you skip legs`) or preference-driven (`your favorite`).
- **Behavior:** tapping a suggestion makes it the current exercise with the keypad primed (jump straight into logging it) — you pick it because you're about to do it.

### 6.8 SetComposer (natural-language input)
- The NL front door: mic-forward, `Say or type your set` placeholder, subtle send affordance. Lives pinned at the bottom in *list mode*.
- Speaking/typing `incline db 60x10x3 @8` runs the parser (Claude Code's next gate) and creates the sets.
- The keypad and the composer are **alternate bottom states** of the same screen — the keypad slides over the composer + tab bar while entering a set, the way a keyboard does.

### 6.9 TabBar
- Three tabs: Today · Log · Trends. **Borderless** (do not rely on default `<button>` styling — reset it or use non-button elements; the visualizer's boxed look was host chrome, not the design).
- Icons 22px, labels 11px. Active tab = `accent` + a 2px accent tick above the icon. Inactive = `text-faint`.

---

## 7. Log screen

### 7.1 Two modes
- **List mode** (between sets/exercises): SessionHeader, CurrentSet, RestTimer, LoggedSetRows, Up next, and the SetComposer + TabBar pinned at the bottom.
- **Entry mode** (typing a set): the NumericKeypad + PrimaryAction slide over the composer/tab-bar region; the list content sits above it.

Toggle: tapping a number (§6.2) or a suggestion (§6.7) → entry mode. Logging or dismissing → back to list mode.

### 7.2 Core flows
1. **Keypad log:** tap number → keypad → type → progression recomputes live → **Log set** → rest resets + auto-advance to next set.
2. **Voice/type log:** speak or type shorthand in the composer → parser → sets created.
3. **Pick-as-you-go:** tap an Up next suggestion → it becomes the current exercise, keypad primed.

### 7.3 Suggestion engine (rule-based, no LLM) — `src/lib/suggest/`
A pure, unit-tested function `suggestNext({ focus, library, sessionExercises, history, recovery, todayISO })` → ranked suggestions. Recomputed on enter-Picker / add / finish. **Gap dominates preference** so favorites don't entrench the chest bias.

- **Candidates** = lifts in the focus (all categories for **Anything**), minus what's already in the session.
- **Phase (compounds first).** Target ~2 primaries for push/pull/legs (0 for core/mobility); under target → suggest `tier=primary`, else `accessory`. Mirrors how a session is built. Anything skips the phase (pure gap).
- **Score = W_gap·gap + W_pref·pref**, `W_gap ≫ W_pref`:
  - **gap** — muscle not yet trained this session (+), focus **anchor** not yet done (+), muscle **not trained in the last ~10 days** (+, "you skip …"), category under-trained over ~10 days via `categoryLoad` (+). Muscle already covered this session (−).
  - **pref** — all-time `frequency`, recency-decayed (a lift just done is down-weighted so it isn't re-suggested).
- **Reason** names the dominant factor: `"main <focus> lift"` · `"you skip <muscle>"` · `"balances <muscle>"` · `"your go-to"` · `"anchor"`.
- **Surfaces:** a **"Suggested"** pin (top 1–2) above Main lifts in the **Picker**; an **"Up next"** strip (top 1–3) under the queue in **Plan**, whose **+** adds a *queued* row (stays plan-first, no jump to Now).
- **WHOOP seam:** `recovery` (a 0–100 score) is accepted but **null/inert** until the WHOOP ingest session. When wired: low recovery lowers the primary target and biases accessories; high allows +1 primary — no engine rewrite. Muscle map = `exercises.muscle` (single primary mover per lift; migration `20260701000007`).

Pure heuristic on the existing schema; gets smarter as history grows.

### 7.4 Runs & WHOOP
Correcting the M1 plan: WHOOP's workout API **does** return, for a run, duration, average/max heart rate, HR-zone durations, strain, calories, and — when the run was GPS-recorded — `distance_meter` and `altitude_gain_meter` (pace = distance ÷ duration). A `workout.updated` webhook pushes it. So WHOOP can auto-populate nearly the whole `runs` row.

Implications:
- **M1:** keep the run entry **minimal** — do not gold-plate a manual form WHOOP will replace. The only fields WHOOP cannot provide are the subjective ones: `ankle_pain_0_10`, `lateral_tightness_0_10`, `symptom_trend`. Those are the durable manual part.
- **Phase-1 target run flow:** WHOOP webhook → prefill duration/HR/distance/elevation/pace → user adds a ~10-second ankle check → save. Make WHOOP run-import an early Phase-1 item.
- Caveat: distance/elevation appear only if the run was GPS-recorded; HR/strain/duration always come through when scored. No route polyline via the API.

---

## 7.5 Log flow v2 — Focus → Picker → Session (selection-first)

First real gym use showed the composer-first landing was backwards: in the gym you *select* what you're doing, you don't type it. The Log tab is now a guided, tap-first flow. Same tokens, borderless system, and it **reuses** every logging component from §6.

### Screens

**Focus (Log tab landing) — "What are you training?"**
Tappable category rows: Push · Pull · Legs · Core · Mobility, then a divider, then Run and Anything. Each strength row shows recency/frequency, and **neglected categories read "due" in amber** — the anti-chest-bias nudge made structural (Chris's stated goal). Mobility is where daily ankle work lives (shows "ankle done today ✓"). If a workout is already in progress, a "Continue · Push · N done" row appears on top. **Run → "Import from WHOOP"** (§7.6), not a manual form.

**Picker (Add exercise for the focus)**
A search field at top that *also* accepts a full shorthand line (`incline db 60x10x3 @8`) — the parser is the power path. Below: exercises for the focus, grouped **Main lifts** (compound/`tier=primary`) above **Accessories** (isolation/`tier=accessory`) — mirroring how a session is built, compounds → complementary. Within each group, **most-used first**, anchors marked with the diamond, each row showing `last: W×R×S`. (Untiered create-on-the-fly rows fall in with Accessories.) A **"Suggested"** pin (the §7.3 engine, top 1–2) sits above Main lifts (e.g. a shoulder movement inside a push day) so frequency ordering doesn't entrench the bias; each shows its reason. Tapping a lift **queues it and returns to Plan** (build the whole plan before starting) — it does *not* jump to Now. Off-list names offer create-on-the-fly.

**Session (the workout) — plan-first, then a `Plan | Now` toggle**
The whole session is **DB-persistent** (`workouts` + `workout_exercises` + `workout_sets`), so it survives a reload or app-switch — essential for an installed iPhone PWA that's backgrounded constantly. Lifecycle:
- **Plan (build phase, before Start).** `+ Add exercise` queues lifts and comes right back here, so you stack several before the clock runs. Rows have a **drag handle** (reorder — persisted) and a remove. The one filled control is **Start workout**; `+ Add` is a quiet secondary until then.
- **Start workout** stamps `started_at` (the clock starts) and opens **Now** for the first queued lift. The `Plan | Now` segmented toggle now appears.
- **Now** = the active-exercise view (CurrentSet, live progression, logged-set rows, rest timer). **Finish exercise** flips that item to **done** and returns to Plan with the next queued lift teed up. Two details make it gym-fast:
  - **Keypad on-demand.** The keypad is **hidden by default** — weight×reps carry over from the last logged set and are big/tappable; the freed space holds the per-set timer, logged rows, and the filled **Log set** button. Tapping the weight or reps number slides the keypad up to edit, then it hides again. Log set records the set and **stays keypad-hidden**, so the common case (same load, next set) is one tap.
  - **Per-set timer.** A stopwatch — **Start set → Stop** — captures the working-set duration into `workout_sets.duration_sec` (Log set auto-stops a running timer). It shows in the logged-set row. Distinct from the rest timer, which auto-starts after Log set.
- **Plan (after Start)** shows the same queue as a hybrid plan+log: **queued** (pending), **now** (amber), **done** (set summary + check). An **"Up next"** strip (§7.3 engine, top 1–3) sits under the queue; its **+** drops a *queued* row (plan-first, no jump to Now). `+ Add` is the filled primary; a quiet **Finish workout** stamps `finished_at`, shows the recap, and lands on Today.

**Resume:** on every Log load, if an unfinished workout exists (`finished_at IS NULL`) the tab opens straight into **Plan** with the queue and logged sets rebuilt from the DB. Focus is shown **only** when there's no active workout. At most one workout is open at a time (a partial unique index enforces it).

One shared session state: editing in Plan updates Now's context; logging in Now checks the item off in Plan. The `Plan | Now` toggle answers "which mode am I in"; the global bottom nav stays stable (Today · Log · Trends) — Plan/Now is *inside* the Log tab, not a global tab (a global Plan tab would sit empty when idle).

### Navigation loop
Today →(Log tab) Focus →(pick focus) Plan. In Plan: `+ Add` → Picker → select → back to Plan (reorder as needed) → **Start workout** → Now; or tap a queued lift → Now. **Finish exercise** → back to Plan. **Finish workout** → recap → Today. Reopening the Log tab mid-session **resumes** into Plan. WHOOP is never navigated *to* — it feeds Today (auto) and drops imported runs into the queue.

## 7.6 WHOOP import (in the Log flow)
- Focus **Run** row = **"Import from WHOOP"**: shows recent WHOOP activities; tap a run to pull it in (objective fields auto-filled per §7.4), then add the ankle check. No manual stat entry.
- Daily recovery/sleep land on **Today** automatically (webhook + morning cron); a manual **"Sync WHOOP"** button on Today forces a pull. See the WHOOP ingest spec for the engine.

### Data note
Persist the session **focus** — nullable `workouts.focus` (`push|pull|legs|core|mobility|run|anything`), set on workout creation. It's the only way Trends can later show balance-over-time; intent can't be backfilled.

The plan-first lifecycle is persisted so a session survives reload/background:
- `workouts.finished_at timestamptz` (NULL = in progress) + a partial unique index on `(user_id) where finished_at is null` → at most one open workout. `started_at` = when Start was tapped.
- `workout_exercises` (id, workout_id, exercise_id, `order_index`, `status ∈ {queued,done}`) = the ordered plan queue. Sets stay in `workout_sets` keyed by `(workout_id, exercise_id)`. Migration `20260701000005_workout_lifecycle.sql`.

---

## 7.7 Today screen (home tab)

**Job:** a glanceable morning **dashboard + motivator**, not a coach. The coaching lives in Plan (§7.5); Today *surfaces* a suggested focus but doesn't argue the case. Everything fits one iPhone screen (19.5:9, no scroll on a 13/16 Pro); Start + tab bar pin to the bottom.

### Order (top → bottom)
1. **Header** — date + a **time-based greeting** (Good morning/afternoon/evening) on the left; **"synced Xm ago"** on the right (data-freshness cue for the WHOOP webhook + morning cron). If a workout is active, a "Resume" affordance replaces the greeting line.
2. **WHOOP rings** — three, in WHOOP's wake-to-day order: **Sleep · Recovery · Strain**. Each = a monochrome progress ring (amber only on Recovery, the key metric; Sleep + Strain in bone) filling toward its target, center value, label, and a sub-stat:
   - Sleep: center `6h20`, sub `72% of need`.
   - Recovery: center `62%`, sub `HRV 48 · RHR 58` (band-meaningful; amber ring).
   - Strain: center `8.4`, sub `target 10–14`, plus a **lighter arc segment** on the ring marking the optimal zone (WHOOP-style — the fill shows where you are vs. that band).
   - Tap any ring → its **detail page** (sleep stages/efficiency/debt · HRV trend/SpO₂/skin temp · strain by workout/HR zones). Detail pages are a fast-follow.
3. **Recovery vs strain** (14-day trend) — grouped with the WHOOP data, directly under the rings. Two lines (recovery amber, strain bone) + a tiny legend. Compact height. This is the "am I digging a hole" read; kept on Today because it's checked often. *(When populated, index both series to a common base — no dual-axis.)*
4. **Fuel** — a thin progress bar (kcal vs target) + `Log food` action (CalTrak). Read-only daily total from CalTrak for MVP; Log food deep-links out. **Fast-follow, post-WHOOP.**
5. **Recommendation** (light) — "Recommended today" + focus (e.g. **Legs**) + `Nd ago` + a short readiness line (`62% recovery → train as planned`) + focus alternates (`or Push · Pull · Core`). The **ankle ring** sits to the **right of this block** (fills the space): a **tappable 10-segment ring** logging **pain 0–10 (lower = better; store in `ankle_logs.pain_0_10`)**, center = today's value, label `Ankle`, rolling into a short average. Fill increases with pain.
6. **Road to Cambridge** (running) — header with the **half-marathon countdown** (`123 days`) + **weekly mileage vs target** bar chart (bars = actual weekly miles from `runs`; dashed rising line = plan target; current week amber). This is the motivator + consistency read.
7. **Start workout** (filled primary, pinned bottom above the tab bar with clear separation) — pre-seeds Log with the recommended focus into Plan (§7.5), via `/log?focus=<focus>`. Alternates override the focus before starting.

### States
- **Shell (pre-WHOOP):** rings + recovery-vs-strain render a graceful **"Connect WHOOP"** empty state (not zeros); everything else (recommendation, ankle, mileage, countdown) works from existing data. Recommendation is rule-based (§7.3, `recovery=null`).
- **Connected:** rings/trend populate from the `recovery` table (fed by WHOOP ingest); the readiness line gains the recovery modifier (low recovery → "lighter, fewer compounds"). Same engine (§7.3), `recovery.score` now non-null.

### Data sources
- Rings + trend → `recovery` table (WHOOP ingest; empty until then).
- Recommendation → the suggestion engine (§7.3), `getHistory`.
- Ankle → `ankle_logs.pain_0_10` (one row/day, upsert).
- Mileage → `runs` aggregated weekly; target + race date (Nov 1 2026) from a **TS config** (`src/lib/config/running.ts`), adoptable by the `goals` table later.
- Fuel → CalTrak daily total (read-only; fast-follow).

### Build split
- **M1 core (built):** the full layout with the **shell state** — rings in "connect WHOOP" empty state, recovery-vs-strain empty, rule-based recommendation, tappable ankle ring → `ankle_logs`, weekly-mileage chart from `runs`, countdown, Start pre-seeds Log.
- **WHOOP ingest (built — the MVP unlock):** OAuth connect + rotating-refresh token store + daily cron/manual Sync/Disconnect (see the ingest spec) populate the `recovery` table → **rings + recovery-vs-strain trend go live** and the §7.3 **recovery modifier** turns on. Empty "Connect WHOOP" state remains until connected.
- **Fast-follow:** ring detail pages; CalTrak Fuel link; WHOOP webhooks (real-time) + run→import + body-weight.
- **Polish pass (2026-07-02, post-ingest):** recovery-vs-strain trend gained day tick labels
  (`text-text-faint`, mirrors the recessive-axis convention). The ankle ring's per-segment
  wedge tap (fiddly, the reported complaint) was replaced with a closed ring display that
  opens a tap-to-open 0–10 chip popover on tap — chips styled like §7's segmented-selector
  convention, popover on `bg-surface` (this token's first real use — previously "reserved for
  future"). Bottom nav got a `min-h-11` tap target and a trimmed outer bar height.

---

## 8. Implementation notes (stack-specific)

- **Tokens:** `atlas-theme.css` is Tailwind v4 `@theme`. Utilities generate automatically (`bg-bg`, `text-accent`, `border-line`, `font-display`, `rounded-control`).
- **Font:** `import { Space_Grotesk } from "next/font/google"`, expose it as a CSS variable on `<html>`, and set `--font-display: var(--font-space-grotesk), …`. Prefer this over a CDN `<link>` in production.
- **Borderless controls:** the real app has no host button chrome, but keep intent explicit — primary action is the only filled control; all others are text/hairline. If a control ever shows an unwanted default border, reset it rather than theme around it.
- **No hardcoded values in components** — colors/type/radii/spacing come from tokens. This is the contract that keeps future re-themes to a single file.
- **Tabular numerals** on anything numeric.
- **Accessibility:** min text 12px in-app; tap targets ≥44px; interactive non-button elements need `role="button"`, `tabindex`, and key handlers (or just use real buttons with the border reset); honor `prefers-reduced-motion`; respect safe-area insets.

---

## 9. Screen roadmap

- [x] **Log** — specified: §6–§7 (components + keypad) and §7.5 (Focus → Picker → Session with `Plan | Now`).
- [x] **Today** — specified: §7.7 (dashboard + motivator: WHOOP rings, recovery-vs-strain, fuel, light recommendation + ankle ring, road-to-Cambridge mileage). Shell state built; WHOOP-connected state after ingest.
- [ ] **Trends** — anchor progression, running, weight, ankle symptoms, consistency; will be appended here.

When Today and Trends are designed, they get their own §7-style sections and any new shared components fold into §6. The tokens rarely change — that's the point.
