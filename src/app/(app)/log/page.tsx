import { getExercises, getHistory } from "@/lib/data/log";
import { ensureSeeded } from "@/lib/actions/seed";
import { computeFocusMeta } from "./util";
import LogScreen from "./LogScreen";

export const metadata = { title: "Log" };

export default async function LogPage() {
  await ensureSeeded(); // first-run safety net (idempotent)
  const [exercises, history] = await Promise.all([
    getExercises(),
    getHistory(),
  ]);
  const focusMeta = computeFocusMeta(exercises, history.last);
  return (
    <LogScreen
      exercises={exercises}
      lastByExercise={history.last}
      sessionsByExercise={history.sessions}
      focusMeta={focusMeta}
    />
  );
}
