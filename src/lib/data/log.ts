import { createClient } from "@/lib/supabase/server";
import type { ExerciseLite } from "@/lib/parser";
import type { LastPerf, SetShape } from "./types";

function fmtWeight(w: number | null): string {
  return w == null ? "BW" : String(w);
}

function summarize(sets: SetShape[]): string {
  const done = sets.filter((s) => s.reps != null);
  if (!done.length) return "";
  const first = done[0];
  const uniform = done.every(
    (s) => s.weight_lbs === first.weight_lbs && s.reps === first.reps,
  );
  if (uniform) return `${fmtWeight(first.weight_lbs)}×${first.reps}×${done.length}`;
  const heaviest = done.reduce((a, b) =>
    (b.weight_lbs ?? 0) > (a.weight_lbs ?? 0) ? b : a,
  );
  return `${fmtWeight(heaviest.weight_lbs)}×${heaviest.reps} · ${done.length} sets`;
}

export async function getExercises(): Promise<ExerciseLite[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("exercises")
    .select("id, name, aliases, is_anchor, default_unit, category")
    .order("name");
  return (data ?? []) as ExerciseLite[];
}

type SetRow = {
  weight_lbs: number | null;
  reps: number | null;
  rpe: number | null;
  set_index: number | null;
  exercise_id: string;
  workout_id: string;
  workouts:
    | { date: string; created_at: string }
    | { date: string; created_at: string }[]
    | null;
};

export type History = {
  /** most-recent session's sets per exercise (for "last" + progression) */
  last: Record<string, LastPerf>;
  /** distinct-workout count per exercise (for "Up next" preference) */
  sessions: Record<string, number>;
};

/**
 * Reduces all of the user's sets once: the most-recent workout per exercise
 * plus how many distinct workouts included each exercise. Fine for a single
 * user; revisit with a view/materialization as history grows.
 */
export async function getHistory(): Promise<History> {
  const supabase = await createClient();
  if (!supabase) return { last: {}, sessions: {} };
  const { data } = await supabase
    .from("workout_sets")
    .select(
      "weight_lbs, reps, rpe, set_index, exercise_id, workout_id, workouts!inner(date, created_at)",
    );
  const rows = (data ?? []) as unknown as SetRow[];
  const meta = (r: SetRow) =>
    Array.isArray(r.workouts) ? r.workouts[0] : r.workouts;

  rows.sort((a, b) => {
    const wa = meta(a);
    const wb = meta(b);
    if (!wa || !wb) return 0;
    if (wa.date !== wb.date) return wa.date < wb.date ? 1 : -1;
    return wa.created_at < wb.created_at ? 1 : -1;
  });

  const chosen: Record<string, string> = {};
  const last: Record<string, LastPerf> = {};
  const seenWorkouts: Record<string, Set<string>> = {};
  for (const r of rows) {
    const w = meta(r);
    if (!w) continue;
    (seenWorkouts[r.exercise_id] ??= new Set()).add(r.workout_id);
    if (!(r.exercise_id in chosen)) {
      chosen[r.exercise_id] = r.workout_id;
      last[r.exercise_id] = { date: w.date, sets: [], summary: "" };
    }
    if (chosen[r.exercise_id] === r.workout_id) {
      last[r.exercise_id].sets.push({
        weight_lbs: r.weight_lbs,
        reps: r.reps,
        rpe: r.rpe,
      });
    }
  }
  for (const id of Object.keys(last)) last[id].summary = summarize(last[id].sets);
  const sessions: Record<string, number> = {};
  for (const id of Object.keys(seenWorkouts)) sessions[id] = seenWorkouts[id].size;

  return { last, sessions };
}
