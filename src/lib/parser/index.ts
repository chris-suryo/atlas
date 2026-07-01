import type {
  ExerciseLite,
  ExerciseMatch,
  ParseOptions,
  ParsedEntry,
  ParsedSet,
} from "./types";

export * from "./types";

const MAX_SETS = 20;

// "60x10x3", optional "x{count}", optional trailing "@{rpe}"
const BY_RE = /^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)(?:x(\d+(?:\.\d+)?))?(?:@(\d+(?:\.\d+)?))?$/;
const AT_RE = /^@(\d+(?:\.\d+)?)$/;

function titleCase(s: string): string {
  return s.replace(/\S+/g, (w) => w[0].toUpperCase() + w.slice(1));
}

function clampRpe(n: number): number | null {
  if (Number.isNaN(n)) return null;
  return Math.min(10, Math.max(1, n));
}

// ---------------------------------------------------------------------------
// 1. Split "<name phrase> <sets spec>"
// ---------------------------------------------------------------------------
export function splitNameAndSpec(input: string): {
  phrase: string;
  spec: string;
} {
  const line = input.trim().replace(/\s+/g, " ");
  // Spec begins at the first token starting with "@" or a digit.
  const m = line.match(/(^|\s)(@?\d)/);
  if (!m || m.index === undefined) return { phrase: line, spec: "" };
  const boundary = m.index + (m[1] ? m[1].length : 0);
  return {
    phrase: line.slice(0, boundary).trim(),
    spec: line.slice(boundary).trim(),
  };
}

// ---------------------------------------------------------------------------
// 2. Resolve the exercise from the name phrase (alias matching)
// ---------------------------------------------------------------------------
function keysFor(ex: ExerciseLite): string[] {
  return [ex.name.toLowerCase(), ...ex.aliases.map((a) => a.toLowerCase())];
}

function variants(phrase: string): string[] {
  const p = phrase.toLowerCase().trim();
  const set = new Set<string>([p]);
  set.add(p.replace(/\bdumbbell\b/g, "db"));
  set.add(p.replace(/\bdb\b/g, "dumbbell"));
  return [...set];
}

export function resolveExercise(
  phrase: string,
  exercises: ExerciseLite[],
  opts: ParseOptions = {},
): ExerciseMatch {
  const p = phrase.toLowerCase().trim();
  if (!p) return { status: "unknown", phrase, suggestedName: "" };

  const pick = (cands: ExerciseLite[]): ExerciseMatch => {
    if (cands.length === 1) return { status: "matched", exercise: cands[0] };
    // tie-break: prefer a single anchor, then most-recently-used, else ambiguous.
    const anchors = cands.filter((c) => c.is_anchor);
    if (anchors.length === 1) return { status: "matched", exercise: anchors[0] };
    const pool = anchors.length ? anchors : cands;
    for (const id of opts.recentExerciseIds ?? []) {
      const hit = pool.find((c) => c.id === id);
      if (hit) return { status: "matched", exercise: hit };
    }
    return { status: "ambiguous", phrase, candidates: pool };
  };

  const exact = exercises.filter((ex) => keysFor(ex).includes(p));
  if (exact.length) return pick(exact);

  // second pass: db <-> dumbbell folding
  for (const v of variants(p)) {
    if (v === p) continue;
    const hits = exercises.filter((ex) => keysFor(ex).includes(v));
    if (hits.length) return pick(hits);
  }

  return { status: "unknown", phrase, suggestedName: titleCase(p) };
}

// ---------------------------------------------------------------------------
// 3. Parse the sets spec into rows
// ---------------------------------------------------------------------------
export function parseSpec(
  spec: string,
  ex?: ExerciseLite | null,
): { sets: ParsedSet[]; lineRpe: number | null } {
  if (!spec.trim()) return { sets: [], lineRpe: null };

  let s = spec.toLowerCase();
  s = s.replace(/\s*([x×*])\s*/g, "x"); // "60 x 10" -> "60x10"
  s = s.replace(/(\d)\s*(?:lbs?|#)/g, "$1"); // strip weight units
  const tokens = s.split(/[\s,]+/).filter(Boolean);

  let lineRpe: number | null = null;
  const setTokens: string[] = [];
  const bareNums: number[] = [];

  for (const tok of tokens) {
    const at = tok.match(AT_RE);
    if (at) {
      lineRpe = clampRpe(parseFloat(at[1]));
      continue;
    }
    if (BY_RE.test(tok)) {
      setTokens.push(tok);
      continue;
    }
    if (/^\d/.test(tok)) {
      const n = parseFloat(tok);
      if (!Number.isNaN(n)) bareNums.push(n);
    }
    // else: stray token (e.g. "bw") — ignored
  }

  let sets: ParsedSet[] = [];

  if (setTokens.length) {
    for (const tok of setTokens) {
      const m = tok.match(BY_RE)!;
      const weight = parseFloat(m[1]);
      const reps = Math.round(parseFloat(m[2]));
      const count = m[3]
        ? Math.min(MAX_SETS, Math.max(1, Math.round(parseFloat(m[3]))))
        : 1;
      const rpe = m[4] ? clampRpe(parseFloat(m[4])) : null;
      for (let i = 0; i < count; i++)
        sets.push({ weight_lbs: weight, reps, rpe });
    }
  } else if (bareNums.length) {
    const weighted = !ex || ex.default_unit === "lbs";
    if (weighted) {
      if (bareNums.length === 1) {
        sets.push({ weight_lbs: bareNums[0], reps: null, rpe: null });
      } else {
        const weight = bareNums[0];
        for (const r of bareNums.slice(1))
          sets.push({ weight_lbs: weight, reps: Math.round(r), rpe: null });
      }
    } else {
      // bodyweight / time / band: each number is a set's reps (no external load)
      for (const r of bareNums)
        sets.push({ weight_lbs: null, reps: Math.round(r), rpe: null });
    }
  }

  sets = sets.slice(0, MAX_SETS);
  if (lineRpe != null) for (const st of sets) if (st.rpe == null) st.rpe = lineRpe;

  return { sets, lineRpe };
}

// ---------------------------------------------------------------------------
// Top-level: parse one line into an entry (one exercise + its sets)
// ---------------------------------------------------------------------------
export function parseLine(
  input: string,
  exercises: ExerciseLite[],
  opts: ParseOptions = {},
): ParsedEntry {
  const { phrase, spec } = splitNameAndSpec(input);
  const match = resolveExercise(phrase, exercises, opts);
  const ex = match.status === "matched" ? match.exercise : null;
  const { sets, lineRpe } = parseSpec(spec, ex);
  return { raw: input, phrase, match, sets, lineRpe };
}
