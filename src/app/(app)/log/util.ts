import type { ExerciseLite } from "@/lib/parser";
import type { LastPerf, SetShape } from "@/lib/data/types";
import { STRENGTH_FOCUSES, type FocusMeta } from "./types";

// Date/clock kept out of component render scope (react-hooks/purity lint).
export function localDateISO(): string {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local TZ
}
export function clockNow(): number {
  return Date.now();
}

export function fmtWeight(w: number | null | undefined): string {
  return w == null ? "BW" : String(w);
}

/** Per-strength-category recency + "due" flag (last trained ≥ 4 days ago / never). */
export function computeFocusMeta(
  exercises: ExerciseLite[],
  lastByExercise: Record<string, LastPerf>,
): FocusMeta {
  const maxDate: Record<string, string> = {};
  for (const ex of exercises) {
    if (!ex.category) continue;
    const d = lastByExercise[ex.id]?.date;
    if (d && (!maxDate[ex.category] || d > maxDate[ex.category])) {
      maxDate[ex.category] = d;
    }
  }
  const todayMs = new Date().getTime();
  const meta: FocusMeta = {};
  for (const cat of STRENGTH_FOCUSES) {
    const d = maxDate[cat];
    if (!d) {
      meta[cat] = { label: "new", due: true };
      continue;
    }
    const days = Math.floor((todayMs - new Date(`${d}T12:00:00`).getTime()) / 86400000);
    meta[cat] = { label: days <= 0 ? "today" : `${days}d ago`, due: days >= 4 };
  }
  return meta;
}
export function fmtClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function topSet(last: LastPerf | undefined): SetShape | null {
  if (!last || !last.sets.length) return null;
  return last.sets.reduce((a, b) => ((b.weight_lbs ?? 0) > (a.weight_lbs ?? 0) ? b : a));
}

/** "60×10×3" if uniform, else heaviest "60×10 · N sets". */
export function summarizeSets(sets: SetShape[]): string {
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

/** Working set vs. the same exercise's last session. */
export function progression(
  weight: number | null,
  reps: number | null,
  last: LastPerf | undefined,
): { text: string; cls: string } | null {
  if (!last || !last.sets.length) return null;
  const top = topSet(last)!;
  const lw = top.weight_lbs ?? 0;
  const lr = top.reps ?? 0;
  if (weight == null || reps == null || Number.isNaN(weight) || Number.isNaN(reps)) {
    return { text: `last ${last.summary}`, cls: "text-text-faint" };
  }
  const ref = `last ${fmtWeight(top.weight_lbs)}×${lr}`;
  if (weight > lw)
    return { text: `+${Math.round((weight - lw) * 10) / 10} lb vs ${ref}`, cls: "text-accent" };
  if (weight < lw) return { text: `vs ${ref}`, cls: "text-text-faint" };
  if (reps > lr) return { text: `+${reps - lr} reps vs ${ref}`, cls: "text-accent" };
  if (reps === lr) return { text: `matched ${ref}`, cls: "text-text-muted" };
  return { text: `vs ${ref}`, cls: "text-text-faint" };
}
