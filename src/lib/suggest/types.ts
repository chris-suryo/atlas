// Rule-based suggestion engine (design §7.3). Pure — no DB, no Date.now(): the
// caller passes today's date so results are deterministic and unit-testable.

export type SuggestFocus =
  | "push"
  | "pull"
  | "legs"
  | "core"
  | "mobility"
  | "anything";

/** The exercise fields the engine reasons over (subset of the DB row). */
export type SuggestExercise = {
  id: string;
  name: string;
  category: string | null;
  tier: "primary" | "accessory" | null;
  muscle: string | null;
  is_anchor: boolean;
};

export type SuggestHistory = {
  /** all-time distinct-workout count per exercise id (preference magnitude) */
  freq: Record<string, number>;
  /** most-recent done date per exercise id, YYYY-MM-DD */
  lastDoneISO: Record<string, string>;
  /** distinct workouts per focus over the last ~10 days (under-trained signal) */
  categoryLoad: Record<string, number>;
};

/** WHOOP seam: a 0–100 recovery score, or null (inert) until WHOOP ingest. */
export type Recovery = { score: number } | null;

export type Suggestion = {
  exercise: SuggestExercise;
  score: number;
  /** dominant-factor label, e.g. "main push lift" / "you skip rear delts". */
  reason: string;
  phase: "primary" | "accessory";
};

export type SuggestInput = {
  focus: SuggestFocus | null;
  /** the full candidate pool (library), filtered to the focus inside. */
  library: SuggestExercise[];
  /** queued + done this workout (their muscles/anchors count as covered). */
  sessionExercises: SuggestExercise[];
  history: SuggestHistory;
  recovery?: Recovery;
  /** today's local date, YYYY-MM-DD (passed in to keep the engine pure). */
  todayISO: string;
  /** max suggestions to return (default 3). */
  limit?: number;
};
