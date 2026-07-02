import type { SupabaseClient } from "@supabase/supabase-js";
import { localDayFromISO } from "@/lib/date";
import { whoopList } from "./api";
import { ensureValidToken } from "./token";

// WHOOP v2 shapes (confirm exact fields against developer.whoop.com). Only the
// fields we map are typed; everything is optional-guarded.
export type Cycle = {
  id: number;
  start: string;
  score?: { strain?: number | null } | null;
};
export type Recovery = {
  cycle_id: number;
  sleep_id?: string | null;
  score?: {
    recovery_score?: number | null;
    hrv_rmssd_milli?: number | null;
    resting_heart_rate?: number | null;
  } | null;
};
export type Sleep = {
  id: string;
  score?: {
    sleep_performance_percentage?: number | null;
    stage_summary?: {
      total_in_bed_time_milli?: number | null;
      total_awake_time_milli?: number | null;
    } | null;
  } | null;
};

export type RecoveryUpsert = {
  user_id: string;
  date: string; // Boston-local YYYY-MM-DD
  recovery_pct: number | null;
  hrv: number | null;
  rhr: number | null;
  sleep_hours: number | null;
  sleep_perf: number | null;
  strain: number | null;
};

function asleepHours(sleep: Sleep | undefined): number | null {
  const s = sleep?.score?.stage_summary;
  if (!s) return null;
  const inBed = s.total_in_bed_time_milli ?? null;
  if (inBed == null) return null;
  const awake = s.total_awake_time_milli ?? 0;
  return Math.round(((inBed - awake) / 3_600_000) * 100) / 100;
}

/**
 * Assemble one `recovery` row per LOCAL day (pure — the testable core). Each
 * WHOOP cycle anchors to the Boston-local date of its `start` (the wake day the
 * readiness applies to); recovery joins by `cycle_id`, sleep by the recovery's
 * `sleep_id`, strain from the cycle.
 */
export function assembleRecoveryRows(
  userId: string,
  cycles: Cycle[],
  recoveries: Recovery[],
  sleeps: Sleep[],
): RecoveryUpsert[] {
  const sleepById = new Map(sleeps.map((s) => [s.id, s]));
  const recByCycle = new Map(recoveries.map((r) => [r.cycle_id, r]));
  const byDate = new Map<string, RecoveryUpsert>();

  for (const c of cycles) {
    const date = localDayFromISO(c.start);
    const rec = recByCycle.get(c.id);
    const sleep = rec?.sleep_id ? sleepById.get(rec.sleep_id) : undefined;
    byDate.set(date, {
      user_id: userId,
      date,
      recovery_pct: rec?.score?.recovery_score ?? null,
      hrv: rec?.score?.hrv_rmssd_milli ?? null,
      rhr: rec?.score?.resting_heart_rate ?? null,
      sleep_hours: asleepHours(sleep),
      sleep_perf: sleep?.score?.sleep_performance_percentage ?? null,
      strain: c.score?.strain ?? null,
    });
  }
  return [...byDate.values()];
}

/**
 * Pull recent recovery/sleep/cycle from WHOOP and upsert one `recovery` row per
 * local day. `db` may be the service-role client (cron) or the session client
 * (owner-RLS, e.g. the connect callback). `source` tags the whoop_debug trace
 * so a stuck cron/manual/connect sync is distinguishable later. Returns the
 * day count.
 */
export async function syncWhoop(
  db: SupabaseClient,
  userId: string,
  source: "cron" | "manual" | "connect",
  days = 14,
): Promise<number> {
  const token = await ensureValidToken(db, userId);
  const start = new Date(Date.now() - days * 86_400_000).toISOString();
  const params = { start };
  const [cycles, recoveries, sleeps] = await Promise.all([
    whoopList<Cycle>(token, "/v2/cycle", params),
    whoopList<Recovery>(token, "/v2/recovery", params),
    whoopList<Sleep>(token, "/v2/activity/sleep", params),
  ]);

  const rows = assembleRecoveryRows(userId, cycles, recoveries, sleeps);
  const partial = rows.filter((r) => r.recovery_pct == null && r.strain != null);
  const summary = `source=${source} cycles=${cycles.length} recoveries=${recoveries.length} sleeps=${sleeps.length} rows=${rows.length} datesWithoutRecovery=${partial.map((r) => r.date).join(",") || "none"}`;
  console.log(`[whoop] sync: ${summary}`);
  try {
    await db.from("whoop_debug").insert({ outcome: "sync_counts", detail: summary.slice(0, 500) });
  } catch {
    // diagnostics are best-effort
  }
  if (rows.length) {
    const { error } = await db
      .from("recovery")
      .upsert(rows, { onConflict: "user_id,date" });
    if (error) {
      console.error("[whoop] sync: recovery upsert failed —", error.message);
      throw new Error(error.message);
    }
  }
  await db
    .from("whoop_connection")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("user_id", userId);
  return rows.length;
}
