import { createClient } from "@/lib/supabase/server";
import type { ExerciseLite } from "@/lib/parser";
import type { ActiveWorkout, Focus, QueueItem } from "@/app/(app)/log/types";
import type { LastPerf, SetShape } from "./types";

const STRENGTH_FOCUS = new Set<Focus>([
  "push",
  "pull",
  "legs",
  "core",
  "mobility",
  "anything",
]);

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
    .select("id, name, aliases, is_anchor, default_unit, category, tier, muscle")
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
  /** distinct-workout count per exercise (preference signal) */
  sessions: Record<string, number>;
  /** workouts per focus over the last ~10 days (category-gap signal, §7.3) */
  categoryLoad: Record<string, number>;
};

/** Rolling window for the category-load (under-trained) signal. */
const CATEGORY_WINDOW_DAYS = 10;

/**
 * Reduces all of the user's sets once: the most-recent workout per exercise
 * plus how many distinct workouts included each exercise. Fine for a single
 * user; revisit with a view/materialization as history grows.
 */
export async function getHistory(): Promise<History> {
  const supabase = await createClient();
  if (!supabase) return { last: {}, sessions: {}, categoryLoad: {} };
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

  // Category load: distinct workouts per focus over the rolling window (the
  // under-trained "gap" signal). One workout row = one session.
  const cutoff = new Date(
    Date.now() - CATEGORY_WINDOW_DAYS * 86400000,
  ).toLocaleDateString("en-CA");
  const { data: recent } = await supabase
    .from("workouts")
    .select("focus, date")
    .gte("date", cutoff);
  const categoryLoad: Record<string, number> = {};
  for (const w of recent ?? []) {
    if (w.focus) categoryLoad[w.focus] = (categoryLoad[w.focus] ?? 0) + 1;
  }

  return { last, sessions, categoryLoad };
}

type WorkoutExerciseRow = {
  id: string;
  exercise_id: string;
  status: "queued" | "done";
  exercises: ExerciseLite | ExerciseLite[] | null;
};

/**
 * The user's one unfinished workout (finished_at IS NULL), rebuilt for resume:
 * its ordered plan queue (workout_exercises) plus the sets logged so far
 * (workout_sets, grouped by exercise). Returns null when nothing is in progress
 * — the Log screen then shows Focus. Runs are one-shot (saveRun closes them), so
 * they never resurface here.
 */
export async function getActiveWorkout(): Promise<ActiveWorkout | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: w } = await supabase
    .from("workouts")
    .select("id, focus, started_at")
    .is("finished_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!w || !w.focus || !STRENGTH_FOCUS.has(w.focus as Focus)) return null;

  const { data: weData } = await supabase
    .from("workout_exercises")
    .select(
      "id, exercise_id, status, exercises!inner(id, name, aliases, is_anchor, default_unit, category, tier, muscle)",
    )
    .eq("workout_id", w.id)
    .order("order_index");
  const weRows = (weData ?? []) as unknown as WorkoutExerciseRow[];

  const { data: setData } = await supabase
    .from("workout_sets")
    .select("weight_lbs, reps, rpe, duration_sec, exercise_id, set_index")
    .eq("workout_id", w.id)
    .order("set_index");
  const byExercise: Record<string, SetShape[]> = {};
  for (const s of setData ?? []) {
    (byExercise[s.exercise_id] ??= []).push({
      weight_lbs: s.weight_lbs,
      reps: s.reps,
      rpe: s.rpe,
      duration_sec: s.duration_sec,
    });
  }

  const queue: QueueItem[] = weRows.map((r) => {
    const ex = Array.isArray(r.exercises) ? r.exercises[0] : r.exercises;
    return {
      rowId: r.id,
      exercise: ex as ExerciseLite,
      status: r.status,
      sets: byExercise[r.exercise_id] ?? [],
    };
  });

  return {
    id: w.id,
    focus: w.focus as Focus,
    started: w.started_at != null,
    queue,
  };
}
