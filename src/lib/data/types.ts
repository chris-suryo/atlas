export type SetShape = {
  weight_lbs: number | null;
  reps: number | null;
  rpe: number | null;
  /** Per-set stopwatch seconds (optional; the parser path omits it). */
  duration_sec?: number | null;
};

/** Most-recent session for an exercise, used for the "last" hint + progression. */
export type LastPerf = {
  date: string;
  sets: SetShape[];
  /** "60×10×3" when uniform, else "60×10 · 3 sets". */
  summary: string;
};
