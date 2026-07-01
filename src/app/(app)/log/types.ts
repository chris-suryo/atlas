import type { ExerciseLite } from "@/lib/parser";
import type { SetShape } from "@/lib/data/types";

export type Focus = "push" | "pull" | "legs" | "core" | "mobility" | "anything";
export const STRENGTH_FOCUSES: Focus[] = ["push", "pull", "legs", "core", "mobility"];

export type QueueStatus = "queued" | "now" | "done";
export type QueueItem = {
  exercise: ExerciseLite;
  status: QueueStatus;
  sets: SetShape[];
};

/** Per-category recency for the Focus screen; `due` renders in amber. */
export type FocusMeta = Record<string, { label: string; due: boolean }>;
