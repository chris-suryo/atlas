export type SetShape = {
  weight_lbs: number | null;
  reps: number | null;
  rpe: number | null;
};

/** Most-recent session for an exercise, used for the "last" hint + progression. */
export type LastPerf = {
  date: string;
  sets: SetShape[];
  /** "60×10×3" when uniform, else "60×10 · 3 sets". */
  summary: string;
};
