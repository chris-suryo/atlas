import { getActiveWorkout, getExercises, getHistory } from "@/lib/data/log";
import {
  getAnkleRecent,
  getRecoveryLatest,
  getRecoverySeries,
  getWeeklyMileage,
  getWhoopStatus,
} from "@/lib/data/today";
import { ensureSeeded } from "@/lib/actions/seed";
import { getUser } from "@/lib/supabase/server";
import { suggestNext, toSuggestExercise } from "@/lib/suggest";
import { daysUntilRace } from "@/lib/config/running";
import { computeFocusMeta } from "../log/util";
import { STRENGTH_FOCUSES, type Focus } from "../log/types";
import TodayScreen from "@/components/today/TodayScreen";

export const metadata = { title: "Today" };

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ whoop?: string }>;
}) {
  const sp = await searchParams;
  // getUser() is request-memoized — this reuses the layout's own auth check
  // rather than a 3rd round trip (ensureSeeded no longer derives it itself).
  await ensureSeeded(await getUser()); // first-run safety net (idempotent)
  const [
    exercises,
    history,
    active,
    recovery,
    recoverySeries,
    whoop,
    ankleRecent,
    buckets,
  ] = await Promise.all([
    getExercises(),
    getHistory(),
    getActiveWorkout(),
    getRecoveryLatest(),
    getRecoverySeries(),
    getWhoopStatus(),
    getAnkleRecent(),
    getWeeklyMileage(),
  ]);

  const todayISO = new Date().toLocaleDateString("en-CA");
  const focusMeta = computeFocusMeta(exercises, history.last);

  // Focus recommendation = the §7.3 engine run across all categories (gap-driven),
  // reduced to distinct strength focuses. recovery=null (WHOOP seam inert).
  const ranked = suggestNext({
    focus: "anything",
    library: exercises.map(toSuggestExercise),
    sessionExercises: [],
    history: {
      freq: history.sessions,
      lastDoneISO: Object.fromEntries(
        Object.entries(history.last).map(([id, p]) => [id, p.date]),
      ),
      categoryLoad: history.categoryLoad,
    },
    // WHOOP live: feed the real recovery score so the readiness modifier kicks in
    // (engine deloads <34 / pushes ≥67). Null until connected → shell behavior.
    recovery: recovery?.recovery_pct != null ? { score: recovery.recovery_pct } : null,
    todayISO,
    limit: 8,
  });
  const cats: Focus[] = [];
  for (const s of ranked) {
    const c = s.exercise.category as Focus | null;
    if (c && STRENGTH_FOCUSES.includes(c) && !cats.includes(c)) cats.push(c);
  }
  const focus: Focus = cats[0] ?? "push";
  const reason =
    ranked.find((s) => (s.exercise.category as Focus) === focus)?.reason ?? "";

  return (
    <TodayScreen
      recovery={recovery}
      recoverySeries={recoverySeries}
      whoop={whoop}
      ankleRecent={ankleRecent}
      buckets={buckets}
      daysLeft={daysUntilRace(todayISO)}
      recommendation={{
        focus,
        alternates: cats.slice(1, 4),
        recencyLabel: focusMeta[focus]?.label ?? "",
        reason,
      }}
      activeFocus={active?.focus ?? null}
      whoopNotice={sp?.whoop ?? null}
    />
  );
}
