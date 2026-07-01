import { describe, it, expect } from "vitest";
import { suggestNext } from "./index";
import type { SuggestExercise, SuggestHistory } from "./types";

const ex = (
  id: string,
  name: string,
  category: string,
  tier: "primary" | "accessory",
  muscle: string,
  is_anchor = false,
): SuggestExercise => ({ id, name, category, tier, muscle, is_anchor });

const PUSH: SuggestExercise[] = [
  ex("chestpress", "Chest Press Machine", "push", "primary", "chest"),
  ex("incline", "Incline DB Press", "push", "primary", "chest", true),
  ex("ohp", "Seated DB Shoulder Press", "push", "primary", "front_delts", true),
  ex("lateral", "DB Lateral Raise", "push", "accessory", "side_delts"),
  ex("pecdeck", "Pec Deck", "push", "accessory", "chest"),
  ex("pushdown", "Tricep Pushdown", "push", "accessory", "triceps"),
];
const PULL: SuggestExercise[] = [
  ex("pulldown", "Lat Pulldown", "pull", "primary", "lats", true),
  ex("row", "Seated Row Machine", "pull", "primary", "upper_back"),
  ex("dbcurl", "DB Curl", "pull", "accessory", "biceps"),
  ex("cablecurl", "Cable Curl", "pull", "accessory", "biceps"),
  ex("facepull", "Face Pulls", "pull", "accessory", "rear_delts"),
];
const LEGS: SuggestExercise[] = [
  ex("legpress", "Leg Press", "legs", "primary", "quads", true),
  ex("legext", "Leg Extension", "legs", "accessory", "quads"),
];
const ALL = [...PUSH, ...PULL, ...LEGS];
const TODAY = "2026-07-01";

const hist = (over: Partial<SuggestHistory> = {}): SuggestHistory => ({
  freq: {},
  lastDoneISO: {},
  categoryLoad: {},
  ...over,
});

describe("suggestNext — phasing", () => {
  it("opens with a compound (primary) and labels the anchor", () => {
    const out = suggestNext({
      focus: "push",
      library: PUSH,
      sessionExercises: [],
      history: hist(),
      todayISO: TODAY,
    });
    expect(out[0].exercise.tier).toBe("primary");
    expect(out[0].reason).toBe("anchor"); // an anchor with no anchor done yet
    // a non-anchor primary reads as the main lift
    expect(out.find((s) => s.exercise.id === "chestpress")?.reason).toBe(
      "main push lift",
    );
  });

  it("returns [] when nothing sensible remains", () => {
    const out = suggestNext({
      focus: "push",
      library: [PUSH[0]],
      sessionExercises: [PUSH[0]],
      history: hist(),
      todayISO: TODAY,
    });
    expect(out).toEqual([]);
  });
});

describe("suggestNext — gap dominates preference", () => {
  it("a fresh/neglected muscle outranks a frequent favorite whose muscle is covered", () => {
    // Session: 2 primaries done + a biceps curl done → phase accessory, biceps covered.
    const session = [PULL[0], PULL[1], PULL[2]]; // pulldown, row, dbcurl
    const out = suggestNext({
      focus: "pull",
      library: PULL,
      sessionExercises: session,
      history: hist({
        freq: { cablecurl: 20 }, // strong favorite…
        lastDoneISO: {
          pulldown: "2026-06-29",
          row: "2026-06-29",
          dbcurl: "2026-06-29",
        },
      }),
      todayISO: TODAY,
    });
    // …but cablecurl repeats biceps (already covered), so face pulls win.
    expect(out[0].exercise.id).toBe("facepull");
    const cable = out.find((s) => s.exercise.id === "cablecurl")!;
    expect(out[0].score).toBeGreaterThan(cable.score);
  });
});

describe("suggestNext — neglect signal", () => {
  it('surfaces a muscle not trained in the window with "you skip <muscle>"', () => {
    const out = suggestNext({
      focus: "pull",
      library: PULL,
      sessionExercises: [],
      history: hist({
        lastDoneISO: {
          pulldown: "2026-06-29", // lats trained 2d ago
          row: "2026-06-11", // upper_back 20d ago → neglected
        },
      }),
      todayISO: TODAY,
    });
    expect(out[0].exercise.id).toBe("row");
    expect(out[0].reason).toBe("you skip upper back");
  });
});

describe("suggestNext — WHOOP recovery seam", () => {
  const base = {
    focus: "push" as const,
    library: PUSH,
    sessionExercises: [PUSH[0]], // 1 primary done (chest)
    history: hist({ lastDoneISO: { chestpress: "2026-06-29" } }),
    todayISO: TODAY,
  };
  it("null recovery keeps the normal primary target (still compounds)", () => {
    const out = suggestNext(base);
    expect(out[0].exercise.tier).toBe("primary");
  });
  it("low recovery lowers the target → switches to accessories sooner", () => {
    const out = suggestNext({ ...base, recovery: { score: 20 } });
    expect(out[0].exercise.tier).toBe("accessory");
  });
});

describe("suggestNext — Anything is gap-driven across categories", () => {
  it("surfaces the under-trained category", () => {
    const out = suggestNext({
      focus: "anything",
      library: ALL,
      sessionExercises: [],
      history: hist({ categoryLoad: { push: 5, pull: 4, legs: 0 } }),
      todayISO: TODAY,
    });
    expect(out[0].exercise.category).toBe("legs");
  });
});
