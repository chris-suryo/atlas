import { getExercises, getLastPerformance } from "@/lib/data/log";
import { todayLabel } from "@/lib/date";
import LogScreen from "./LogScreen";

export const metadata = { title: "Log" };

export default async function LogPage() {
  const [exercises, lastByExercise] = await Promise.all([
    getExercises(),
    getLastPerformance(),
  ]);
  return (
    <LogScreen
      exercises={exercises}
      lastByExercise={lastByExercise}
      dateLabel={todayLabel()}
    />
  );
}
