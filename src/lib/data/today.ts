import { createClient } from "@/lib/supabase/server";
import { bucketRunsByWeek, type WeekBucket } from "@/lib/config/running";

/** Local (server-side) YYYY-MM-DD. Single user in one timezone (Boston). */
function serverTodayISO(): string {
  return new Date().toLocaleDateString("en-CA");
}
function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 86400000).toLocaleDateString("en-CA");
}

export type RecoveryRow = {
  date: string;
  recovery_pct: number | null;
  hrv: number | null;
  rhr: number | null;
  sleep_hours: number | null;
  sleep_perf: number | null;
  strain: number | null;
};

/** Most-recent WHOOP recovery row, or null (empty until WHOOP ingest → shell state). */
export async function getRecoveryLatest(): Promise<RecoveryRow | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("recovery")
    .select("date, recovery_pct, hrv, rhr, sleep_hours, sleep_perf, strain")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as RecoveryRow | null) ?? null;
}

export type AnkleDay = { date: string; pain_0_10: number | null };

/** Recent ankle-pain logs (for today's value + a short rolling average). */
export async function getAnkleRecent(days = 14): Promise<AnkleDay[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("ankle_logs")
    .select("date, pain_0_10")
    .gte("date", daysAgoISO(days))
    .order("date", { ascending: false });
  return (data ?? []) as AnkleDay[];
}

type RunRow = {
  distance_miles: number | null;
  workouts: { date: string } | { date: string }[] | null;
};

/** Weekly mileage buckets (actual from `runs` + planned target) for the chart. */
export async function getWeeklyMileage(weeks = 8): Promise<WeekBucket[]> {
  const supabase = await createClient();
  if (!supabase) return bucketRunsByWeek([], serverTodayISO(), weeks);
  const { data } = await supabase
    .from("runs")
    .select("distance_miles, workouts!inner(date)");
  const rows = (data ?? []) as unknown as RunRow[];
  const runs = rows.map((r) => {
    const w = Array.isArray(r.workouts) ? r.workouts[0] : r.workouts;
    return { distance_miles: r.distance_miles, date: w?.date ?? "" };
  });
  return bucketRunsByWeek(runs, serverTodayISO(), weeks);
}
