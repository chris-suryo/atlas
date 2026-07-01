import { describe, it, expect } from "vitest";
import { localDayFromISO } from "@/lib/date";
import { assembleRecoveryRows, type Cycle, type Recovery, type Sleep } from "./sync";

describe("localDayFromISO — Boston local day (DST-aware)", () => {
  it("maps late-night UTC to the previous local day", () => {
    // 02:30 UTC on Jul 1 = 22:30 EDT on Jun 30
    expect(localDayFromISO("2026-07-01T02:30:00Z")).toBe("2026-06-30");
    // 12:00 UTC on Jul 1 = 08:00 EDT same day
    expect(localDayFromISO("2026-07-01T12:00:00Z")).toBe("2026-07-01");
    // 04:30 UTC on Jan 1 = 23:30 EST on Dec 31 (standard time)
    expect(localDayFromISO("2026-01-01T04:30:00Z")).toBe("2025-12-31");
  });
});

describe("assembleRecoveryRows — join by cycle/sleep, anchor to local day", () => {
  it("maps recovery + sleep + strain into one row per local date", () => {
    const cycles: Cycle[] = [
      { id: 1, start: "2026-07-01T11:00:00Z", score: { strain: 12.3 } }, // 07:00 EDT
    ];
    const recoveries: Recovery[] = [
      {
        cycle_id: 1,
        sleep_id: "s1",
        score: { recovery_score: 66, hrv_rmssd_milli: 48, resting_heart_rate: 55 },
      },
    ];
    const sleeps: Sleep[] = [
      {
        id: "s1",
        score: {
          sleep_performance_percentage: 82,
          stage_summary: {
            total_in_bed_time_milli: 8 * 3_600_000,
            total_awake_time_milli: 0.5 * 3_600_000,
          },
        },
      },
    ];
    const rows = assembleRecoveryRows("u1", cycles, recoveries, sleeps);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      user_id: "u1",
      date: "2026-07-01",
      recovery_pct: 66,
      hrv: 48,
      rhr: 55,
      sleep_perf: 82,
      strain: 12.3,
    });
    expect(rows[0].sleep_hours).toBeCloseTo(7.5, 2); // 8h in bed − 0.5h awake
  });

  it("leaves fields null when a cycle has no recovery/sleep", () => {
    const rows = assembleRecoveryRows(
      "u1",
      [{ id: 9, start: "2026-06-20T12:00:00Z", score: { strain: 5 } }],
      [],
      [],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      date: "2026-06-20",
      recovery_pct: null,
      hrv: null,
      sleep_hours: null,
      sleep_perf: null,
      strain: 5,
    });
  });
});
