"use client";

import { useEffect, useRef, useState } from "react";
import { IconCheck, IconClock, IconPlus } from "@tabler/icons-react";
import { parseLine, type ExerciseLite } from "@/lib/parser";
import type { LastPerf, SetShape } from "@/lib/data/types";
import NumericKeypad from "@/components/log/NumericKeypad";
import SetComposer from "@/components/log/SetComposer";
import { appendSets, createExercise } from "./actions";

type Draft = { weight: string; reps: string; rpe: number | null };
type Entry = { exercise: ExerciseLite; sets: SetShape[] };
type Pending =
  | { kind: "ambiguous"; candidates: ExerciseLite[]; sets: SetShape[] }
  | { kind: "unknown"; name: string; sets: SetShape[] }
  | null;

const CATEGORIES = ["push", "pull", "legs", "core", "cardio", "mobility"];
const EQUIPMENT = [
  "machine",
  "smith",
  "dumbbell",
  "cable",
  "bodyweight",
  "functional",
  "band",
];

function localDateISO(): string {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local TZ
}
function clockNow(): number {
  return Date.now();
}
function fmtWeight(w: number | null | undefined): string {
  return w == null ? "BW" : String(w);
}
function topSet(last: LastPerf | undefined): SetShape | null {
  if (!last || !last.sets.length) return null;
  return last.sets.reduce((a, b) => ((b.weight_lbs ?? 0) > (a.weight_lbs ?? 0) ? b : a));
}
function upsertEntry(prev: Entry[], ex: ExerciseLite, add: SetShape[]): Entry[] {
  const i = prev.findIndex((e) => e.exercise.id === ex.id);
  if (i === -1) return [...prev, { exercise: ex, sets: add }];
  const copy = [...prev];
  copy[i] = { ...copy[i], sets: [...copy[i].sets, ...add] };
  return copy;
}

const REST_TARGET_S = 120;

/** Rule-based "Up next": blend of preference (frequency) and gap (anchors /
 * untrained categories today). Gets smarter as history grows. */
function suggestUpNext(
  library: ExerciseLite[],
  entries: Entry[],
  sessions: Record<string, number>,
): { ex: ExerciseLite; reason: string }[] {
  const doneToday = new Set(entries.map((e) => e.exercise.id));
  const catsToday = new Set(entries.map((e) => e.exercise.category ?? ""));
  return library
    .filter((ex) => !doneToday.has(ex.id))
    .map((ex) => {
      const freq = sessions[ex.id] ?? 0;
      let score = Math.min(3, freq * 0.5);
      let reason = "";
      if (ex.is_anchor) {
        score += 5;
        reason = "anchor";
      }
      if (ex.category && !catsToday.has(ex.category)) {
        score += 3;
        if (!reason) reason = `adds ${ex.category}`;
      }
      if (!reason && freq >= 3) reason = "your favorite";
      if (!reason) reason = ex.category ? `adds ${ex.category}` : "suggested";
      return { ex, reason, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ ex, reason }) => ({ ex, reason }));
}

export default function LogScreen({
  exercises,
  lastByExercise,
  sessionsByExercise,
  dateLabel,
}: {
  exercises: ExerciseLite[];
  lastByExercise: Record<string, LastPerf>;
  sessionsByExercise: Record<string, number>;
  dateLabel: string;
}) {
  const [library, setLibrary] = useState(exercises);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ weight: "", reps: "", rpe: null });
  const [field, setField] = useState<"weight" | "reps">("weight");
  const [mode, setMode] = useState<"list" | "entry">("list");
  const [composer, setComposer] = useState("");
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(0);
  const [restStartedAt, setRestStartedAt] = useState<number | null>(null);

  const workoutIdRef = useRef<string | null>(null);
  const chainRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (startedAt == null) return;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  const current = currentId
    ? library.find((e) => e.id === currentId) ?? null
    : null;
  const currentSets = entries.find((e) => e.exercise.id === currentId)?.sets ?? [];
  const setNumber = currentSets.length + 1;
  const last = currentId ? lastByExercise[currentId] : undefined;
  const totalSets = entries.reduce((n, e) => n + e.sets.length, 0);
  const volume = entries.reduce(
    (v, e) => v + e.sets.reduce((s, x) => s + (x.weight_lbs ?? 0) * (x.reps ?? 0), 0),
    0,
  );

  function markStarted() {
    const now = clockNow();
    setStartedAt((prev) => prev ?? now);
    setNowMs((prev) => prev || now);
  }

  function persist(exerciseId: string, sets: SetShape[], startIndex: number) {
    markStarted();
    chainRef.current = chainRef.current
      .then(async () => {
        const res = await appendSets({
          workoutId: workoutIdRef.current,
          date: localDateISO(),
          exerciseId,
          sets: sets.map((s, i) => ({
            weight_lbs: s.weight_lbs,
            reps: s.reps,
            rpe: s.rpe,
            set_index: startIndex + i,
          })),
        });
        if (res.ok) workoutIdRef.current = res.workoutId;
        else setError(res.error);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  function primeDraftFrom(ex: ExerciseLite) {
    const t = topSet(lastByExercise[ex.id]);
    setDraft({
      weight: t?.weight_lbs != null ? String(t.weight_lbs) : "",
      reps: t?.reps != null ? String(t.reps) : "",
      rpe: t?.rpe ?? null,
    });
  }

  function startExercise(ex: ExerciseLite) {
    setLibrary((lib) => (lib.some((e) => e.id === ex.id) ? lib : [...lib, ex]));
    setCurrentId(ex.id);
    primeDraftFrom(ex);
    setField("weight");
    setMode("entry");
  }

  function addSets(ex: ExerciseLite, sets: SetShape[]) {
    setLibrary((lib) => (lib.some((e) => e.id === ex.id) ? lib : [...lib, ex]));
    const startIndex =
      entries.find((e) => e.exercise.id === ex.id)?.sets.length ?? 0;
    setEntries((prev) => upsertEntry(prev, ex, sets));
    persist(ex.id, sets, startIndex);
    setRestStartedAt(clockNow());
    setCurrentId(ex.id);
    const lastSet = sets[sets.length - 1];
    setDraft({
      weight: lastSet.weight_lbs != null ? String(lastSet.weight_lbs) : "",
      reps: lastSet.reps != null ? String(lastSet.reps) : "",
      rpe: lastSet.rpe,
    });
    setMode("list");
  }

  function logSet() {
    if (!current) return;
    const w = draft.weight.trim() === "" ? null : parseFloat(draft.weight);
    const r = draft.reps.trim() === "" ? null : Math.round(parseFloat(draft.reps));
    const weight = w != null && !Number.isNaN(w) ? w : null;
    const reps = r != null && !Number.isNaN(r) ? r : null;
    if (weight == null && reps == null) return;
    const set: SetShape = { weight_lbs: weight, reps, rpe: draft.rpe };
    const startIndex = currentSets.length;
    setEntries((prev) => upsertEntry(prev, current, [set]));
    persist(current.id, [set], startIndex);
    setRestStartedAt(clockNow());
    setField("weight"); // auto-advance, keypad primed with same values
  }

  function recentIds(): string[] {
    return [...entries].reverse().map((e) => e.exercise.id);
  }

  function onCompose() {
    const text = composer.trim();
    if (!text) return;
    const entry = parseLine(text, library, { recentExerciseIds: recentIds() });
    setComposer("");
    if (entry.match.status === "unknown") {
      setPending({
        kind: "unknown",
        name: entry.match.suggestedName || entry.phrase,
        sets: entry.sets,
      });
      return;
    }
    if (entry.match.status === "ambiguous") {
      setPending({ kind: "ambiguous", candidates: entry.match.candidates, sets: entry.sets });
      return;
    }
    const ex = entry.match.exercise;
    if (entry.sets.length) addSets(ex, entry.sets);
    else startExercise(ex);
  }

  function choose(ex: ExerciseLite, sets: SetShape[]) {
    setPending(null);
    if (sets.length) addSets(ex, sets);
    else startExercise(ex);
  }

  async function doCreate(name: string, category: string, equipment: string, sets: SetShape[]) {
    setPending(null);
    const res = await createExercise({ name, category, equipment });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    choose(res.exercise, sets);
  }

  function onDigit(d: string) {
    markStarted();
    setDraft((prev) => {
      const cur = prev[field];
      if (d === "." && cur.includes(".")) return prev;
      if (cur.replace(".", "").length >= 4) return prev;
      const next = cur === "0" && d !== "." ? d : cur + d;
      return { ...prev, [field]: next };
    });
  }
  function onBackspace() {
    setDraft((prev) => ({ ...prev, [field]: prev[field].slice(0, -1) }));
  }

  const prog = progression(draft, last);
  const elapsed = startedAt != null ? Math.max(0, nowMs - startedAt) : 0;
  const restElapsed =
    restStartedAt != null ? Math.max(0, nowMs - restStartedAt) : 0;
  const upNextList = suggestUpNext(library, entries, sessionsByExercise);

  return (
    <div className="relative flex h-full flex-col">
      {/* SessionHeader */}
      <div className="flex items-baseline justify-between px-7 pb-0 pt-[max(1.25rem,env(safe-area-inset-top))] text-xs">
        <span className="text-text-muted">
          Strength · {dateLabel}
          {startedAt != null && (
            <span className="text-text-faint"> · {fmtClock(elapsed)}</span>
          )}
        </span>
        <span className="text-text-faint">
          {totalSets} {totalSets === 1 ? "set" : "sets"} · {fmtVolume(volume)}
        </span>
      </div>

      {/* Content */}
      <div
        className={`flex min-h-0 flex-1 flex-col px-7 ${
          mode === "entry" ? "justify-start pt-6" : "justify-center"
        }`}
      >
        {pending ? (
          <PendingPanel
            pending={pending}
            onChoose={choose}
            onCreate={doCreate}
            onCancel={() => setPending(null)}
          />
        ) : current ? (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {current.is_anchor && (
                  <span className="block h-[7px] w-[7px] shrink-0 rotate-45 bg-accent" />
                )}
                <span className="text-[19px] font-medium">{current.name}</span>
              </div>
              <span className="text-xs text-text-faint">Set {setNumber}</span>
            </div>

            <div className="mt-6 flex items-baseline justify-center gap-4">
              <button
                type="button"
                onClick={() => {
                  setField("weight");
                  setMode("entry");
                }}
                className={`text-[38px] font-medium tracking-[-0.5px] ${
                  field === "weight" && mode === "entry" ? "text-accent" : "text-text"
                }`}
              >
                {draft.weight || "0"}
              </button>
              <span className="text-[15px] text-text-muted">lb</span>
              <span className="text-[22px] text-text-faint">×</span>
              <button
                type="button"
                onClick={() => {
                  setField("reps");
                  setMode("entry");
                }}
                className={`text-[38px] font-medium tracking-[-0.5px] ${
                  field === "reps" && mode === "entry" ? "text-accent" : "text-text"
                }`}
              >
                {draft.reps || "0"}
              </button>
            </div>

            <div className="mt-3.5 flex items-center justify-center text-[13px] text-text-muted">
              <span>
                {draft.rpe != null && (
                  <>
                    RPE {draft.rpe}
                    {prog && <span className="mx-1.5 text-text-faint">·</span>}
                  </>
                )}
                {prog && <span className={prog.cls}>{prog.text}</span>}
              </span>
            </div>

            {restStartedAt != null && (
              <div className="mt-6 flex items-center gap-2.5 text-[13px] text-text-muted">
                <IconClock size={15} className="text-text-faint" />
                <span>
                  Resting{" "}
                  <span className="text-text">{fmtClock(restElapsed)}</span>{" "}
                  <span className="text-text-faint">
                    / {fmtClock(REST_TARGET_S * 1000)}
                  </span>
                </span>
                <div className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-line">
                  <div
                    className="absolute inset-y-0 left-0 bg-accent"
                    style={{
                      width: `${Math.min(100, (restElapsed / (REST_TARGET_S * 1000)) * 100)}%`,
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setRestStartedAt(null)}
                  className="text-xs text-text-faint"
                >
                  Skip
                </button>
              </div>
            )}

            {mode === "list" && currentSets.length > 0 && (
              <div className="mt-7">
                {currentSets.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center border-t border-line py-3 text-sm"
                  >
                    <span className="w-14 text-text-faint">Set {i + 1}</span>
                    <span className="flex-1 text-text-muted">
                      {fmtWeight(s.weight_lbs)} × {s.reps ?? "—"}
                    </span>
                    {s.rpe != null && (
                      <span className="mr-4 text-text-faint">RPE {s.rpe}</span>
                    )}
                    <IconCheck size={16} className="text-accent" />
                  </div>
                ))}
              </div>
            )}

            {mode === "list" && upNextList.length > 0 && (
              <div className="mt-8">
                <div className="mb-1 text-xs text-text-muted">Up next</div>
                {upNextList.map(({ ex, reason }) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => startExercise(ex)}
                    className="flex w-full items-center border-t border-line py-3 text-left text-sm"
                  >
                    {ex.is_anchor && (
                      <span className="mr-2.5 block h-[7px] w-[7px] shrink-0 rotate-45 bg-accent" />
                    )}
                    <span className="flex-1 text-text">{ex.name}</span>
                    <span className="mr-4 text-xs text-text-faint">{reason}</span>
                    <IconPlus size={16} className="text-text-muted" />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center">
            <p className="text-sm text-text-muted">Say or type your first set.</p>
            <p className="mt-2 font-mono text-[13px] text-text-faint">
              incline db 60x10x3 @8
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="px-7 pb-2 text-center text-xs text-red-400">{error}</div>
      )}

      {/* Bottom: composer (list) or keypad overlay (entry) */}
      {mode === "list" ? (
        <SetComposer value={composer} onChange={setComposer} onSubmit={onCompose} />
      ) : (
        <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md bg-bg">
          <NumericKeypad
            field={field}
            onDigit={onDigit}
            onBackspace={onBackspace}
            onLogSet={logSet}
            onVoice={() => setMode("list")}
            canLog={draft.weight.trim() !== "" || draft.reps.trim() !== ""}
          />
        </div>
      )}
    </div>
  );
}

function progression(
  draft: Draft,
  last: LastPerf | undefined,
): { text: string; cls: string } | null {
  if (!last || !last.sets.length) return null;
  const top = topSet(last)!;
  const lw = top.weight_lbs ?? 0;
  const lr = top.reps ?? 0;
  const w = draft.weight.trim() === "" ? null : parseFloat(draft.weight);
  const r = draft.reps.trim() === "" ? null : parseInt(draft.reps, 10);
  if (w == null || r == null || Number.isNaN(w) || Number.isNaN(r)) {
    return { text: `last ${last.summary}`, cls: "text-text-faint" };
  }
  const ref = `last ${fmtWeight(top.weight_lbs)}×${lr}`;
  if (w > lw) return { text: `+${round(w - lw)} lb vs ${ref}`, cls: "text-accent" };
  if (w < lw) return { text: `vs ${ref}`, cls: "text-text-faint" };
  if (r > lr) return { text: `+${r - lr} reps vs ${ref}`, cls: "text-accent" };
  if (r === lr) return { text: `matched ${ref}`, cls: "text-text-muted" };
  return { text: `vs ${ref}`, cls: "text-text-faint" };
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
function fmtClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}
function fmtVolume(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k lb` : `${v} lb`;
}

function PendingPanel({
  pending,
  onChoose,
  onCreate,
  onCancel,
}: {
  pending: NonNullable<Pending>;
  onChoose: (ex: ExerciseLite, sets: SetShape[]) => void;
  onCreate: (name: string, category: string, equipment: string, sets: SetShape[]) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(pending.kind === "unknown" ? pending.name : "");
  const [category, setCategory] = useState("push");
  const [equipment, setEquipment] = useState("machine");

  if (pending.kind === "ambiguous") {
    return (
      <div>
        <p className="text-sm text-text-muted">Which one?</p>
        <div className="mt-4 space-y-1">
          {pending.candidates.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onChoose(c, pending.sets)}
              className="flex w-full items-center gap-2.5 border-t border-line py-3 text-left text-[15px] text-text"
            >
              {c.is_anchor && (
                <span className="block h-[7px] w-[7px] shrink-0 rotate-45 bg-accent" />
              )}
              {c.name}
            </button>
          ))}
        </div>
        <button type="button" onClick={onCancel} className="mt-4 text-xs text-text-faint">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-text-muted">New exercise</p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mt-3 w-full border-b border-line bg-transparent py-2 text-[19px] font-medium text-text outline-none focus:border-accent"
      />
      <div className="mt-5 flex gap-3">
        <Selector label="Category" value={category} options={CATEGORIES} onChange={setCategory} />
        <Selector label="Equipment" value={equipment} options={EQUIPMENT} onChange={setEquipment} />
      </div>
      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={() => onCreate(name.trim(), category, equipment, pending.sets)}
          disabled={!name.trim()}
          className="rounded-control bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink disabled:opacity-40"
        >
          Create
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-text-faint">
          Cancel
        </button>
      </div>
    </div>
  );
}

function Selector({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex-1 text-xs text-text-faint">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border-b border-line bg-bg py-2 text-sm capitalize text-text outline-none focus:border-accent"
      >
        {options.map((o) => (
          <option key={o} value={o} className="capitalize">
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
