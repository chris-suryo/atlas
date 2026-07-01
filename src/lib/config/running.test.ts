import { describe, it, expect } from "vitest";
import {
  RACE_ISO,
  daysUntilRace,
  weekStartISO,
  weeklyTargetMiles,
  bucketRunsByWeek,
} from "./running";

describe("running config — dates", () => {
  it("counts days to the Cambridge half", () => {
    expect(RACE_ISO).toBe("2026-11-01");
    expect(daysUntilRace("2026-11-01")).toBe(0);
    expect(daysUntilRace("2026-10-31")).toBe(1);
    expect(daysUntilRace("2026-11-02")).toBe(-1);
    expect(daysUntilRace("2026-07-01")).toBe(123); // matches §7.7's "123 days"
  });

  it("snaps to the Monday week-start", () => {
    expect(weekStartISO("2026-07-01")).toBe("2026-06-29"); // Wed → Mon
    expect(weekStartISO("2026-06-29")).toBe("2026-06-29"); // Mon → itself
    expect(weekStartISO("2026-07-05")).toBe("2026-06-29"); // Sun → same Mon
  });
});

describe("running config — mileage target", () => {
  it("ramps around an 18mi current week", () => {
    expect(weeklyTargetMiles(0)).toBe(18);
    expect(weeklyTargetMiles(-1)).toBe(16.5);
    expect(weeklyTargetMiles(1)).toBe(19.5);
    expect(weeklyTargetMiles(-100)).toBe(6); // floor
    expect(weeklyTargetMiles(100)).toBe(26); // cap
  });
});

describe("running config — weekly buckets", () => {
  it("sums runs into the right week and flags the current one", () => {
    const runs = [
      { distance_miles: 3, date: "2026-06-30" }, // this week
      { distance_miles: 2.5, date: "2026-06-29" }, // this week (Mon)
      { distance_miles: 4, date: "2026-06-24" }, // prev week
    ];
    const b = bucketRunsByWeek(runs, "2026-07-01", 8);
    expect(b).toHaveLength(8);
    const current = b[b.length - 1];
    const prev = b[b.length - 2];
    expect(current.isCurrent).toBe(true);
    expect(current.weekStartISO).toBe("2026-06-29");
    expect(current.miles).toBe(5.5);
    expect(current.target).toBe(18);
    expect(prev.miles).toBe(4);
    expect(prev.target).toBe(weeklyTargetMiles(-1));
  });

  it("empty weeks read zero miles", () => {
    const b = bucketRunsByWeek([], "2026-07-01", 4);
    expect(b).toHaveLength(4);
    expect(b.every((w) => w.miles === 0)).toBe(true);
  });
});
