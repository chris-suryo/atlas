import { getExercises, getHistory } from "@/lib/data/log";
import { todayLabel } from "@/lib/date";
import LogScreen from "./LogScreen";

export const metadata = { title: "Log" };

export default async function LogPage() {
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
