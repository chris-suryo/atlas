export type DefaultUnit = "lbs" | "bodyweight" | "time" | "band";

/** The exercise fields the parser needs (subset of the DB row). */
export type ExerciseLite = {
  id: string;
  name: string;
  aliases: string[]; // stored lowercased
  is_anchor: boolean;
  default_unit: DefaultUnit;
  category?: string | null;
  tier?: "primary" | "accessory" | null;
  muscle?: string | null;
};

export type ParsedSet = {
  weight_lbs: number | null;
  reps: number | null;
  rpe: number | null;
};

export type ExerciseMatch =
  | { status: "matched"; exercise: ExerciseLite }
  | { status: "ambiguous"; phrase: string; candidates: ExerciseLite[] }
  | { status: "unknown"; phrase: string; suggestedName: string };

export type ParsedEntry = {
  raw: string;
  phrase: string;
  match: ExerciseMatch;
  sets: ParsedSet[];
  lineRpe: number | null;
};

export type ParseOptions = {
  /** exercise ids ordered most-recently-used first, to break alias ties */
  recentExerciseIds?: string[];
};
