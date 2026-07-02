import { getActiveWorkout, getExercises, getHistory } from "@/lib/data/log";
import { ensureSeeded } from "@/lib/actions/seed";
import { getUser } from "@/lib/supabase/server";
import { computeFocusMeta } from "./util";
import { STRENGTH_FOCUSES, type Focus } from "./types";
import LogScreen from "./LogScreen";

export const metadata = { title: "Log" };

/** `/log?focus=push` (from Today's Start) pre-seeds the Picker for that focus. */
function parseFocus(raw: string | undefined): Focus | null {
  if (!raw) return null;
  if (raw === "anything") return "anything";
  return (STRENGTH_FOCUSES as string[]).includes(raw) ? (raw as Focus) : null;
}

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  // getUser() is request-memoized — this reuses the layout's own auth check
  // rather than a 3rd round trip (ensureSeeded no longer derives it itself).
  await ensureSeeded(await getUser()); // first-run safety net (idempotent)
  const [sp, exercises, history, active] = await Promise.all([
    searchParams,
    getExercises(),
    getHistory(),
    getActiveWorkout(),
  ]);
  const focusMeta = computeFocusMeta(exercises, history.last);
  return (
    <LogScreen
      exercises={exercises}
      lastByExercise={history.last}
      sessionsByExercise={history.sessions}
      categoryLoad={history.categoryLoad}
      focusMeta={focusMeta}
      active={active}
      initialFocus={parseFocus(sp?.focus)}
    />
  );
}
