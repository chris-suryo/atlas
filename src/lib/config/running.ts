// Running / half-marathon config (design §7.7 "Road to Cambridge"). Static for
// M1 — race date + a simple weekly mileage-target ramp live here rather than in
// the DB (the `goals` table can adopt this later without touching the UI).
// All date math is pure (ISO in/out, no Date) so it's deterministic + testable.

/** Cambridge half-marathon race day. */
export const RACE_ISO = "2026-11-01";

const CURRENT_WEEK_TARGET_MI = 18; // this week's planned volume
const WEEKLY_STEP_MI = 1.5; // ramp per week toward race
const TARGET_MIN_MI = 6;
const TARGET_MAX_MI = 26;

// --- pure ISO-date helpers (Howard Hinnant civil<->days) ------------------
function epochDayFromISO(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return NaN;
  const yy = m <= 2 ? y - 1 : y;
  const era = Math.floor((yy >= 0 ? yy : yy - 399) / 400);
  const yoe = yy - era * 400;
  const doy = Math.floor((153 * (m > 2 ? m - 3 : m + 9) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}
function isoFromEpochDay(z: number): string {
  const zz = z + 719468;
  const era = Math.floor((zz >= 0 ? zz : zz - 146096) / 146097);
  const doe = zz - era * 146097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  );
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  const year = m <= 2 ? y + 1 : y;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(m)}-${pad(d)}`;
}

/** Whole days from `todayISO` to race day (negative once past). */
export function daysUntilRace(todayISO: string): number {
  return epochDayFromISO(RACE_ISO) - epochDayFromISO(todayISO);
}

/** Monday-based week-start (ISO) for a given date. */
export function weekStartISO(iso: string): string {
  const z = epochDayFromISO(iso);
  if (Number.isNaN(z)) return iso;
  const mondayZero = ((((z % 7) + 3) % 7) + 7) % 7; // 1970-01-01 was a Thursday
  return isoFromEpochDay(z - mondayZero);
}

/** Planned miles for a week, by offset (0 = current week, negative = past). */
export function weeklyTargetMiles(weekOffset: number): number {
  const t = CURRENT_WEEK_TARGET_MI + weekOffset * WEEKLY_STEP_MI;
  return Math.round(Math.min(TARGET_MAX_MI, Math.max(TARGET_MIN_MI, t)) * 10) / 10;
}

export type WeekBucket = {
  weekStartISO: string;
  weekOffset: number; // 0 = current, negative = past
  miles: number; // actual, summed from runs
  target: number; // planned
  isCurrent: boolean;
};

/**
 * Bucket runs into the trailing `weeks` weeks (oldest → current). Pure: pass the
 * runs (each with its workout date) + today. Weeks with no runs read 0 miles.
 */
export function bucketRunsByWeek(
  runs: { distance_miles: number | null; date: string }[],
  todayISO: string,
  weeks = 8,
): WeekBucket[] {
  const curZ = epochDayFromISO(weekStartISO(todayISO));
  const buckets: WeekBucket[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const offset = -i;
    buckets.push({
      weekStartISO: isoFromEpochDay(curZ - i * 7),
      weekOffset: offset,
      miles: 0,
      target: weeklyTargetMiles(offset),
      isCurrent: i === 0,
    });
  }
  const idx = new Map(buckets.map((b, i) => [b.weekStartISO, i]));
  for (const r of runs) {
    const i = idx.get(weekStartISO(r.date));
    if (i != null) buckets[i].miles += r.distance_miles ?? 0;
  }
  for (const b of buckets) b.miles = Math.round(b.miles * 10) / 10;
  return buckets;
}
