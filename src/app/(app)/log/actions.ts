"use server";

import { createClient } from "@/lib/supabase/server";
import type { ExerciseLite } from "@/lib/parser";

type SetInput = {
  weight_lbs: number | null;
  reps: number | null;
  rpe: number | null;
  set_index: number;
  duration_sec?: number | null;
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
    duration_sec: s.duration_sec ?? null,
  }));
  const { error } = await supabase.from("workout_sets").insert(rows);
  if (error) return { ok: false, error: error.message };
  return { ok: true, workoutId };
}

type OkResult = { ok: true } | { ok: false; error: string };

type PlanAddResult =
  | { ok: true; workoutId: string; rowId: string }
  | { ok: false; error: string };

/**
 * Plan-first: queue an exercise. Creates the (unstarted, unfinished) workout on
 * the first add — lazily, so picking a Focus without adding leaves no row — then
 * inserts a `queued` workout_exercises row. Does not log any sets.
 */
export async function addToPlan(input: {
  workoutId: string | null;
  date: string;
  focus: string;
  exerciseId: string;
  orderIndex: number;
}): Promise<PlanAddResult> {
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

  const { data: we, error: weErr } = await supabase
    .from("workout_exercises")
    .insert({
      user_id: user.id,
      workout_id: workoutId,
      exercise_id: input.exerciseId,
      order_index: input.orderIndex,
    })
    .select("id")
    .single();
  if (weErr || !we) {
    return { ok: false, error: weErr?.message ?? "Could not add exercise." };
  }
  return { ok: true, workoutId, rowId: we.id as string };
}

/** Persist a new plan order (order_index per workout_exercises row). */
export async function reorderPlan(input: {
  rows: { id: string; order_index: number }[];
}): Promise<OkResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  for (const r of input.rows) {
    const { error } = await supabase
      .from("workout_exercises")
      .update({ order_index: r.order_index })
      .eq("id", r.id);
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Remove a queued exercise from the plan. */
export async function removeFromPlan(input: { rowId: string }): Promise<OkResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("workout_exercises")
    .delete()
    .eq("id", input.rowId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Start the clock: stamp workouts.started_at. */
export async function startWorkout(input: { workoutId: string }): Promise<OkResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("workouts")
    .update({ started_at: new Date().toISOString() })
    .eq("id", input.workoutId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Mark a plan exercise done (its sets are already in workout_sets). */
export async function finishPlanExercise(input: {
  rowId: string;
}): Promise<OkResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("workout_exercises")
    .update({ status: "done" })
    .eq("id", input.rowId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Close the workout: stamp workouts.finished_at (frees the one-active guard). */
export async function finishWorkout(input: {
  workoutId: string;
}): Promise<OkResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("workouts")
    .update({ finished_at: new Date().toISOString() })
    .eq("id", input.workoutId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
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
      // Runs are one-shot: close immediately so they never resume as a plan
      // and don't occupy the one-active-workout slot.
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
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
