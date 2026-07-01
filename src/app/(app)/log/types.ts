import type { ExerciseLite } from "@/lib/parser";
import type { SetShape } from "@/lib/data/types";

export type Focus = "push" | "pull" | "legs" | "core" | "mobility" | "anything";
export const STRENGTH_FOCUSES: Focus[] = ["push", "pull", "legs", "core", "mobility"];

/** `now` is a client-only transient (the open lift); the DB stores only queued|done. */
export type QueueStatus = "queued" | "now" | "done";
export type QueueItem = {
  /** `workout_exercises.id`; empty string only during the optimistic pre-insert gap. */
  rowId: string;
  exercise: ExerciseLite;
  status: QueueStatus;
  sets: SetShape[];
};

/** The unfinished workout resumed on Log load (design §7.5, plan-first lifecycle). */
export type ActiveWorkout = {
  id: string;
  focus: Focus;
  started: boolean;
  queue: QueueItem[];
};

/** Per-category recency for the Focus screen; `due` renders in amber. */
export type FocusMeta = Record<string, { label: string; due: boolean }>;
