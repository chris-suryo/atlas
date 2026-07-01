// Rule-based "what's next" coach (design §7.3). Blends PREFERENCE (what Chris
// reaches for) with GAP (what's neglected) — gap dominates so favorites don't
// entrench the chest bias. Compounds-first phasing via `tier`; per-muscle and
// per-category balance via `muscle` + 10-day category load. WHOOP-ready: an
// optional `recovery` score shifts the primary target (inert while null).
//
// Pure and deterministic: no DB, no Date.now() (today is passed in).

import type { ExerciseLite } from "@/lib/parser";
import type {
  SuggestExercise,
  SuggestFocus,
  SuggestInput,
  Suggestion,
} from "./types";

/** Map a DB exercise row to the subset the engine reasons over. */
export function toSuggestExercise(e: ExerciseLite): SuggestExercise {
  return {
    id: e.id,
    name: e.name,
    category: e.category ?? null,
    tier: e.tier ?? null,
    muscle: e.muscle ?? null,
    is_anchor: e.is_anchor,
  };
}

/** Target number of primary (compound) lifts before switching to accessories. */
const PRIMARY_TARGET: Record<string, number> = {
  push: 2,
  pull: 2,
  legs: 2,
  core: 0,
  mobility: 0,
};

// Gap components (weighted by W_GAP). Gap ≫ preference.
const W_GAP = 100;
const W_PREF = 8;
const GAP_MUSCLE_SESSION = 3; // muscle not yet trained this session
const GAP_ANCHOR = 4; // focus anchor not yet done
const GAP_NEGLECT = 5; // muscle not trained in the last window
const PENALTY_MUSCLE_REPEAT = 5; // muscle already covered this session
const CATEGORY_BASELINE = 2; // ~2 sessions/10d per category is "enough"

const NEGLECT_DAYS = 10; // muscle stale after this many days
const RECENCY_FULL_DAYS = 4; // preference fully "recharges" after this long
// WHOOP recovery bands (0–100), matching WHOOP's red/green split.
const RECOVERY_LOW = 34;
const RECOVERY_HIGH = 67;

// --- pure date helpers (no Date, so tests stay deterministic) -------------
function daysFromCivil(y: number, m: number, d: number): number {
  const yy = m <= 2 ? y - 1 : y;
  const era = Math.floor((yy >= 0 ? yy : yy - 399) / 400);
  const yoe = yy - era * 400;
  const doy = Math.floor((153 * (m > 2 ? m - 3 : m + 9) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}
function epochDay(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return NaN;
  return daysFromCivil(y, m, d);
}
function daysSince(todayISO: string, iso: string | undefined): number {
  if (!iso) return Infinity;
  const a = epochDay(todayISO);
  const b = epochDay(iso);
  if (Number.isNaN(a) || Number.isNaN(b)) return Infinity;
  return a - b;
}

function muscleLabel(m: string | null): string {
  return m ? m.replace(/_/g, " ") : "";
}

/** Most-recent training day per muscle, from the library + per-exercise last-done. */
function muscleRecency(
  library: SuggestExercise[],
  lastDoneISO: Record<string, string>,
  todayISO: string,
): Record<string, number> {
  const best: Record<string, number> = {};
  for (const ex of library) {
    if (!ex.muscle) continue;
    const iso = lastDoneISO[ex.id];
    if (!iso) continue;
    const d = daysSince(todayISO, iso);
    if (!(ex.muscle in best) || d < best[ex.muscle]) best[ex.muscle] = d;
  }
  return best;
}

function primaryTarget(focus: SuggestFocus | null, recovery: number | null): number {
  if (focus == null || focus === "anything") return 0;
  let target = PRIMARY_TARGET[focus] ?? 0;
  if (recovery != null && target > 0) {
    if (recovery < RECOVERY_LOW) target = Math.max(0, target - 1); // deload
    else if (recovery >= RECOVERY_HIGH) target = target + 1; // push harder
  }
  return target;
}

/**
 * Rank the best next lifts for the current focus + session state. Returns the
 * top `limit` (default 3), best first. Empty when nothing sensible remains.
 */
export function suggestNext(input: SuggestInput): Suggestion[] {
  const {
    focus,
    library,
    sessionExercises,
    history,
    recovery = null,
    todayISO,
    limit = 3,
  } = input;

  const inSession = new Set(sessionExercises.map((e) => e.id));
  const sessionMuscles = new Set(
    sessionExercises.map((e) => e.muscle).filter((m): m is string => !!m),
  );
  const anchorGapActive = !sessionExercises.some((e) => e.is_anchor);
  const hasHistory = Object.keys(history.lastDoneISO).length > 0;
  const muscleDays = muscleRecency(library, history.lastDoneISO, todayISO);

  const anything = focus == null || focus === "anything";
  let candidates = library.filter(
    (e) => !inSession.has(e.id) && (anything || e.category === focus),
  );
  if (candidates.length === 0) return [];

  // Phase: compounds first until the primary target is met, then accessories.
  const target = primaryTarget(focus, recovery ? recovery.score : null);
  const usePhase = !anything && target > 0;
  const primariesDone = sessionExercises.filter(
    (e) => e.tier === "primary" && (anything || e.category === focus),
  ).length;
  const phase: "primary" | "accessory" =
    usePhase && primariesDone < target ? "primary" : "accessory";
  if (usePhase) {
    const inPhase = candidates.filter((e) => (e.tier ?? "accessory") === phase);
    if (inPhase.length > 0) candidates = inPhase; // else fall back to all
  }

  const scored = candidates.map((ex) => {
    const muscle = ex.muscle;
    const freshMuscle = !!muscle && !sessionMuscles.has(muscle);
    const repeatMuscle = !!muscle && sessionMuscles.has(muscle);
    const staleDays = muscle ? (muscleDays[muscle] ?? Infinity) : 0;
    const neglected = hasHistory && !!muscle && staleDays >= NEGLECT_DAYS;
    const anchorGap = ex.is_anchor && anchorGapActive;
    const categoryGap = Math.max(
      0,
      CATEGORY_BASELINE - (history.categoryLoad[ex.category ?? ""] ?? 0),
    );

    let gap = 0;
    if (freshMuscle) gap += GAP_MUSCLE_SESSION;
    if (anchorGap) gap += GAP_ANCHOR;
    if (neglected) gap += GAP_NEGLECT;
    gap += categoryGap;
    if (repeatMuscle) gap -= PENALTY_MUSCLE_REPEAT;

    const damp = Math.min(1, daysSince(todayISO, history.lastDoneISO[ex.id]) / RECENCY_FULL_DAYS);
    const pref = (history.freq[ex.id] ?? 0) * damp;

    const score = W_GAP * gap + W_PREF * pref;
    const focusLabel = !anything ? String(focus) : (ex.category ?? "");
    const reason = neglected
      ? `you skip ${muscleLabel(muscle)}`
      : anchorGap
        ? "anchor"
        : phase === "primary" && ex.tier === "primary"
          ? `main ${focusLabel} lift`
          : freshMuscle && sessionMuscles.size > 0
            ? `balances ${muscleLabel(muscle)}`
            : categoryGap > 0 && anything
              ? `you skip ${focusLabel}`
              : "your go-to";

    return { exercise: ex, score, reason, phase };
  });

  scored.sort(
    (a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name),
  );
  return scored.slice(0, limit);
}
