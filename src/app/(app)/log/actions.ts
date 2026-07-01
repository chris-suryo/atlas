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
 * Appends sets to today's strength workout, creating the workout on the first
 * call (incremental persistence — logging is the save, no separate step).
 */
export async function appendSets(input: {
  workoutId: string | null;
  date: string; // client's local YYYY-MM-DD
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
    const { data, error } = await supabase
      .from("workouts")
      .insert({ user_id: user.id, date: input.date, type: "strength" })
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

/** Creates a library exercise on the fly (from the NL composer's unknown path). */
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
