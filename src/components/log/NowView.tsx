"use client";

import { useEffect, useState } from "react";
import {
  IconCheck,
  IconClock,
  IconPlayerStopFilled,
  IconStopwatch,
} from "@tabler/icons-react";
import type { ExerciseLite } from "@/lib/parser";
import type { LastPerf, SetShape } from "@/lib/data/types";
import NumericKeypad from "@/components/log/NumericKeypad";
import {
  clockNow,
  fmtClock,
  fmtWeight,
  progression,
  topSet,
} from "@/app/(app)/log/util";

const REST_TARGET_S = 120;

type Draft = { weight: string; reps: string; rpe: number | null };

function primeFrom(last: LastPerf | undefined): Draft {
  const t = topSet(last);
  return {
    weight: t?.weight_lbs != null ? String(t.weight_lbs) : "",
    reps: t?.reps != null ? String(t.reps) : "",
    rpe: t?.rpe ?? null,
  };
}

/**
 * Active-exercise logging (design §6 keypad, re-hosted in Session "Now").
 * Parent remounts this via `key={exercise.id}`, so the draft primes fresh.
 * Keypad is on-demand: weight×reps carry over from the last logged set and are
 * tappable to edit; the freed space holds the per-set timer + logged rows.
 */
export default function NowView({
  exercise,
  sets,
  last,
  onLogSet,
  onFinish,
}: {
  exercise: ExerciseLite;
  sets: SetShape[];
  last?: LastPerf;
  onLogSet: (s: SetShape) => void;
  onFinish: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => primeFrom(last));
  const [field, setField] = useState<"weight" | "reps">("weight");
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [restStartedAt, setRestStartedAt] = useState<number | null>(null);
  const [setRunStart, setSetRunStart] = useState<number | null>(null);
  const [setCapturedSec, setSetCapturedSec] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(0);

  useEffect(() => {
    if (restStartedAt == null && setRunStart == null) return;
    const t = setInterval(() => setNowMs(clockNow()), 1000);
    return () => clearInterval(t);
  }, [restStartedAt, setRunStart]);

  const setNumber = sets.length + 1;
  const w = draft.weight.trim() === "" ? null : parseFloat(draft.weight);
  const r = draft.reps.trim() === "" ? null : parseInt(draft.reps, 10);
  const prog = progression(w, r, last);
  const restElapsed = restStartedAt != null ? Math.max(0, nowMs - restStartedAt) : 0;
  const setElapsedMs = setRunStart != null ? Math.max(0, nowMs - setRunStart) : 0;
  const canLog = draft.weight.trim() !== "" || draft.reps.trim() !== "";

  function onDigit(d: string) {
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
  function tapField(f: "weight" | "reps") {
    setField(f);
    setKeypadOpen(true);
  }
  function startSet() {
    const t = clockNow();
    setSetRunStart(t);
    setSetCapturedSec(null);
    setRestStartedAt(null); // a new set ends the rest
    setNowMs(t);
  }
  function stopSet() {
    if (setRunStart == null) return;
    setSetCapturedSec(Math.round(Math.max(0, clockNow() - setRunStart) / 1000));
    setSetRunStart(null);
  }
  function logSet() {
    const weight = w != null && !Number.isNaN(w) ? w : null;
    const reps = r != null && !Number.isNaN(r) ? Math.round(r) : null;
    if (weight == null && reps == null) return;
    let duration = setCapturedSec;
    if (setRunStart != null) {
      duration = Math.round(Math.max(0, clockNow() - setRunStart) / 1000);
    }
    onLogSet({ weight_lbs: weight, reps, rpe: draft.rpe, duration_sec: duration ?? null });
    setField("weight");
    setKeypadOpen(false);
    setSetRunStart(null);
    setSetCapturedSec(null);
    const t = clockNow();
    setRestStartedAt(t);
    setNowMs(t);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-7 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {exercise.is_anchor && (
              <span className="block h-[7px] w-[7px] shrink-0 rotate-45 bg-accent" />
            )}
            <span className="text-[19px] font-medium">{exercise.name}</span>
          </div>
          <span className="text-xs text-text-faint">Set {setNumber}</span>
        </div>

        <div className="mt-6 flex items-baseline justify-center gap-4">
          <button
            type="button"
            onClick={() => tapField("weight")}
            className={`text-[38px] font-medium tracking-[-0.5px] ${
              keypadOpen && field === "weight" ? "text-accent" : "text-text"
            }`}
          >
            {draft.weight || "0"}
          </button>
          <span className="text-[15px] text-text-muted">lb</span>
          <span className="text-[22px] text-text-faint">×</span>
          <button
            type="button"
            onClick={() => tapField("reps")}
            className={`text-[38px] font-medium tracking-[-0.5px] ${
              keypadOpen && field === "reps" ? "text-accent" : "text-text"
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

        {/* Per-set stopwatch */}
        <div className="mt-6 flex items-center gap-3 text-[13px] text-text-muted">
          <IconStopwatch size={15} className="text-text-faint" />
          {setRunStart != null ? (
            <>
              <span>
                Set{" "}
                <span className="text-text tabular-nums">{fmtClock(setElapsedMs)}</span>
              </span>
              <button
                type="button"
                onClick={stopSet}
                className="flex items-center gap-1 text-xs text-accent"
              >
                <IconPlayerStopFilled size={13} /> Stop
              </button>
            </>
          ) : setCapturedSec != null ? (
            <>
              <span>
                Set{" "}
                <span className="text-text tabular-nums">
                  {fmtClock(setCapturedSec * 1000)}
                </span>
              </span>
              <button
                type="button"
                onClick={startSet}
                className="text-xs text-text-faint"
              >
                Restart
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={startSet}
              className="text-xs text-text-faint"
            >
              Start set
            </button>
          )}
        </div>

        {restStartedAt != null && (
          <div className="mt-4 flex items-center gap-2.5 text-[13px] text-text-muted">
            <IconClock size={15} className="text-text-faint" />
            <span>
              Resting <span className="text-text">{fmtClock(restElapsed)}</span>{" "}
              <span className="text-text-faint">/ {fmtClock(REST_TARGET_S * 1000)}</span>
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

        {sets.length > 0 && (
          <div className="mt-7">
            {sets.map((s, i) => (
              <div
                key={i}
                className="flex items-center border-t border-line py-3 text-sm"
              >
                <span className="w-14 text-text-faint">Set {i + 1}</span>
                <span className="flex-1 text-text-muted">
                  {fmtWeight(s.weight_lbs)} × {s.reps ?? "—"}
                </span>
                {s.duration_sec != null && (
                  <span className="mr-4 text-text-faint tabular-nums">
                    {fmtClock(s.duration_sec * 1000)}
                  </span>
                )}
                {s.rpe != null && (
                  <span className="mr-4 text-text-faint">RPE {s.rpe}</span>
                )}
                <IconCheck size={16} className="text-accent" />
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onFinish}
          className="mt-8 w-full py-2 text-center text-sm text-text-muted"
        >
          Finish exercise
        </button>
      </div>

      {keypadOpen ? (
        <NumericKeypad
          field={field}
          onDigit={onDigit}
          onBackspace={onBackspace}
          onLogSet={logSet}
          canLog={canLog}
        />
      ) : (
        <div className="border-t border-line px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3.5">
          <button
            type="button"
            onClick={logSet}
            disabled={!canLog}
            className="w-full rounded-control bg-accent px-4 py-3.5 text-base font-medium text-accent-ink transition-opacity disabled:opacity-40"
          >
            Log set
          </button>
        </div>
      )}
    </div>
  );
}
