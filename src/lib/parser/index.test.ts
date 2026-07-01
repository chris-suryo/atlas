import { describe, it, expect } from "vitest";
import {
  parseLine,
  parseSpec,
  resolveExercise,
  splitNameAndSpec,
} from "./index";
import type { ExerciseLite } from "./types";

const ex = (
  id: string,
  name: string,
  aliases: string[],
  is_anchor = false,
  default_unit: ExerciseLite["default_unit"] = "lbs",
): ExerciseLite => ({ id, name, aliases, is_anchor, default_unit });

const LIB: ExerciseLite[] = [
  ex(
    "incline",
    "Incline DB Press",
    ["incline db", "incline dumbbell", "incline press", "incline db press", "incline"],
    true,
  ),
  ex("seatedrow", "Seated Cable Row", ["seated row", "cable row", "rows", "row", "seated cable row"], true),
  ex("rowmachine", "Seated Row Machine", ["row machine", "machine row", "seated row machine"]),
  ex("pulldown", "Lat Pulldown", ["lat pulldown", "pulldown", "pulldowns", "lats", "lat pull", "pull down"], true),
  ex("smithrdl", "Smith RDL", ["smith rdl", "smith romanian", "smith deadlift", "smith hinge", "rdl"]),
  ex("dbrdl", "DB Romanian Deadlift", ["db rdl", "dumbbell rdl", "db romanian", "db romanian deadlift"]),
  ex("dbcurl", "DB Curl", ["db curl", "dumbbell curl", "curl", "curls", "biceps", "bicep curl"]),
  ex("plank", "Plank", ["plank", "planks", "front plank"], false, "time"),
];

describe("splitNameAndSpec", () => {
  it("splits name phrase from numeric spec", () => {
    expect(splitNameAndSpec("incline db 60x10x3 @8")).toEqual({
      phrase: "incline db",
      spec: "60x10x3 @8",
    });
  });
  it("treats a line with no numbers as all name", () => {
    expect(splitNameAndSpec("lat pulldown")).toEqual({
      phrase: "lat pulldown",
      spec: "",
    });
  });
});

describe("worked examples", () => {
  it("incline db 60x10x3 @8 → Incline DB Press, 3×(60×10 @8)", () => {
    const e = parseLine("incline db 60x10x3 @8", LIB);
    expect(e.match.status).toBe("matched");
    expect(e.match.status === "matched" && e.match.exercise.id).toBe("incline");
    expect(e.sets).toEqual([
      { weight_lbs: 60, reps: 10, rpe: 8 },
      { weight_lbs: 60, reps: 10, rpe: 8 },
      { weight_lbs: 60, reps: 10, rpe: 8 },
    ]);
  });

  it("seated row 120 10 10 10 → 120×10 three times (weight then per-set reps)", () => {
    const e = parseLine("seated row 120 10 10 10", LIB);
    expect(e.match.status === "matched" && e.match.exercise.id).toBe("seatedrow");
    expect(e.sets).toEqual([
      { weight_lbs: 120, reps: 10, rpe: null },
      { weight_lbs: 120, reps: 10, rpe: null },
      { weight_lbs: 120, reps: 10, rpe: null },
    ]);
  });

  it("pulldown 120x10 110x9 100x8 → three varied sets", () => {
    const e = parseLine("pulldown 120x10 110x9 100x8", LIB);
    expect(e.match.status === "matched" && e.match.exercise.id).toBe("pulldown");
    expect(e.sets).toEqual([
      { weight_lbs: 120, reps: 10, rpe: null },
      { weight_lbs: 110, reps: 9, rpe: null },
      { weight_lbs: 100, reps: 8, rpe: null },
    ]);
  });

  it("rdl 95x8x3 → Smith RDL (rdl is the primary hinge)", () => {
    const e = parseLine("rdl 95x8x3", LIB);
    expect(e.match.status === "matched" && e.match.exercise.id).toBe("smithrdl");
    expect(e.sets).toHaveLength(3);
    expect(e.sets[0]).toEqual({ weight_lbs: 95, reps: 8, rpe: null });
  });

  it("curl 30 12 10 8 → DB Curl, 30 for 12/10/8", () => {
    const e = parseLine("curl 30 12 10 8", LIB);
    expect(e.match.status === "matched" && e.match.exercise.id).toBe("dbcurl");
    expect(e.sets).toEqual([
      { weight_lbs: 30, reps: 12, rpe: null },
      { weight_lbs: 30, reps: 10, rpe: null },
      { weight_lbs: 30, reps: 8, rpe: null },
    ]);
  });

  it("bench 135x5 → unknown, offers to create", () => {
    const e = parseLine("bench 135x5", LIB);
    expect(e.match.status).toBe("unknown");
    expect(e.match.status === "unknown" && e.match.suggestedName).toBe("Bench");
  });
});

describe("resolveExercise tie-breaking", () => {
  const tie: ExerciseLite[] = [
    ex("a", "A press", ["press"], false),
    ex("b", "B press", ["press"], true),
  ];
  it("prefers the anchor on an alias collision", () => {
    const r = resolveExercise("press", tie);
    expect(r.status === "matched" && r.exercise.id).toBe("b");
  });
  it("prefers most-recently-used when no single anchor", () => {
    const two: ExerciseLite[] = [ex("a", "A", ["press"]), ex("b", "B", ["press"])];
    const r = resolveExercise("press", two, { recentExerciseIds: ["b"] });
    expect(r.status === "matched" && r.exercise.id).toBe("b");
  });
  it("returns ambiguous when it cannot decide", () => {
    const two: ExerciseLite[] = [ex("a", "A", ["press"]), ex("b", "B", ["press"])];
    const r = resolveExercise("press", two);
    expect(r.status).toBe("ambiguous");
    expect(r.status === "ambiguous" && r.candidates).toHaveLength(2);
  });
  it("folds dumbbell <-> db", () => {
    const r = resolveExercise("dumbbell romanian", LIB);
    expect(r.status === "matched" && r.exercise.id).toBe("dbrdl");
  });
});

describe("parseSpec formats", () => {
  it("handles spaced separators and weight units", () => {
    expect(parseSpec("60 x 10").sets).toEqual([{ weight_lbs: 60, reps: 10, rpe: null }]);
    expect(parseSpec("60lb x 10").sets).toEqual([{ weight_lbs: 60, reps: 10, rpe: null }]);
  });
  it("accepts a per-set rpe override", () => {
    const { sets } = parseSpec("60x10@9 65x8");
    expect(sets).toEqual([
      { weight_lbs: 60, reps: 10, rpe: 9 },
      { weight_lbs: 65, reps: 8, rpe: null },
    ]);
  });
  it("applies line rpe only where a set has none", () => {
    const { sets } = parseSpec("60x10@9 65x8 @7");
    expect(sets).toEqual([
      { weight_lbs: 60, reps: 10, rpe: 9 },
      { weight_lbs: 65, reps: 8, rpe: 7 },
    ]);
  });
  it("a lone weighted number leaves reps blank", () => {
    expect(parseSpec("30", LIB[6]).sets).toEqual([
      { weight_lbs: 30, reps: null, rpe: null },
    ]);
  });
  it("bodyweight/time exercises treat bare numbers as reps", () => {
    const plank = LIB.find((e) => e.id === "plank")!;
    expect(parseSpec("60 45 30", plank).sets).toEqual([
      { weight_lbs: null, reps: 60, rpe: null },
      { weight_lbs: null, reps: 45, rpe: null },
      { weight_lbs: null, reps: 30, rpe: null },
    ]);
  });
  it("clamps rpe to 1..10", () => {
    expect(parseSpec("60x10 @14").sets[0].rpe).toBe(10);
  });
});
