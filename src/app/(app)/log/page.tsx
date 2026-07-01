import { getExercises, getHistory } from "@/lib/data/log";
import { ensureSeeded } from "@/lib/actions/seed";
import { todayLabel } from "@/lib/date";
import LogScreen from "./LogScreen";

export const metadata = { title: "Log" };

export default async function LogPage() {
  await ensureSeeded(); // first-run safety net (idempotent)
  const [exercises, history] = await Promise.all([
    getExercises(),
    getHistory(),
  ]);
  return (
    <LogScreen
      exercises={exercises}
      lastByExercise={history.last}
      sessionsByExercise={history.sessions}
      dateLabel={todayLabel()}
    />
  );
}
