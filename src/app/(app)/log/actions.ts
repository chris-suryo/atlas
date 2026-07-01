"use server";

import { createClient } from "@/lib/supabase/server";
import type { ExerciseLite } from "@/lib/parser";

type SetInput = {
  weight_lbs: number | null;
  reps: number | null;
  rpe: number | null;
  set_index: number;
};

type AppendResult =
  | { ok: true; workoutId: string }
  | { ok: false; error: string };

/**
 * Appends sets to today's workout, creating it (with its focus) on the first
 * call. Incremental persistence — logging is the save.
 */
export async function appendSets(input: {
  workoutId: string | null;
  date: string; // client's local YYYY-MM-DD
  focus: string | null; // workouts.focus
  exerciseId: string;
  sets: SetInput[];
}): Promise<AppendResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  let workoutId = input.workoutId;
  if (!workoutId) {
    const type = input.focus === "mobility" ? "mobility" : "strength";
    const { data, error } = await supabase
      .from("workouts")
      .insert({ user_id: user.id, date: input.date, type, focus: input.focus })
      .select("id")
      .single();
    if (error || !data) {
      return { ok: false, error: error?.message ?? "Could not start workout." };
    }
    workoutId = data.id as string;
  }

  const rows = input.sets.map((s) => ({
    user_id: user.id,
    workout_id: workoutId,
    exercise_id: input.exerciseId,
    weight_lbs: s.weight_lbs,
    reps: s.reps,
    rpe: s.rpe,
    set_index: s.set_index,
  }));
  const { error } = await supabase.from("workout_sets").insert(rows);
  if (error) return { ok: false, error: error.message };
  return { ok: true, workoutId };
}

type CreateResult =
  | { ok: true; exercise: ExerciseLite }
  | { ok: false; error: string };

/** Creates a library exercise on the fly (from the Picker's create path). */
export async function createExercise(input: {
  name: string;
  category: string;
  equipment: string;
}): Promise<CreateResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data, error } = await supabase
    .from("exercises")
    .insert({
      user_id: user.id,
      name: input.name,
      category: input.category,
      equipment: input.equipment,
      default_unit: "lbs",
      aliases: [],
    })
    .select("id, name, aliases, is_anchor, default_unit, category")
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not create exercise." };
  }
  return { ok: true, exercise: data as ExerciseLite };
}

type RunResult = { ok: true } | { ok: false; error: string };

/** Minimal manual run entry (placeholder until WHOOP import, design §7.6). */
export async function saveRun(input: {
  date: string;
  distance_miles: number | null;
  duration_sec: number | null;
  pace_min_per_mile: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  elevation_gain_ft: number | null;
  ankle_pain_0_10: number | null;
  lateral_tightness_0_10: number | null;
  symptom_trend: string | null;
  perceived_effort: number | null;
}): Promise<RunResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: w, error: we } = await supabase
    .from("workouts")
    .insert({
      user_id: user.id,
      date: input.date,
      type: "easy_run",
      focus: "run",
      perceived_effort: input.perceived_effort,
    })
    .select("id")
    .single();
  if (we || !w) return { ok: false, error: we?.message ?? "Could not save run." };

  const { error } = await supabase.from("runs").insert({
    user_id: user.id,
    workout_id: w.id,
    distance_miles: input.distance_miles,
    duration_sec: input.duration_sec,
    pace_min_per_mile: input.pace_min_per_mile,
    avg_hr: input.avg_hr,
    max_hr: input.max_hr,
    elevation_gain_ft: input.elevation_gain_ft,
    ankle_pain_0_10: input.ankle_pain_0_10,
    lateral_tightness_0_10: input.lateral_tightness_0_10,
    symptom_trend: input.symptom_trend,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
