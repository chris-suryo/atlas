"use client";

import { useRef, useState } from "react";
import { parseLine, type ExerciseLite } from "@/lib/parser";
import type { LastPerf, SetShape } from "@/lib/data/types";
import {
  STRENGTH_FOCUSES,
  type Focus,
  type FocusMeta,
  type QueueItem,
} from "./types";
import { localDateISO } from "./util";
import { appendSets, createExercise, saveRun } from "./actions";
import FocusView from "@/components/log/FocusView";
import PickerView from "@/components/log/PickerView";
import PlanView from "@/components/log/PlanView";
import NowView from "@/components/log/NowView";
import RecapView from "@/components/log/RecapView";
import RunForm, { type RunInput } from "@/components/log/RunForm";

type Screen = "focus" | "picker" | "session" | "run" | "recap";

function titleCase(s: string): string {
  return s.replace(/\S+/g, (w) => (w ? w[0].toUpperCase() + w.slice(1) : w));
}

export default function LogScreen({
  exercises,
  lastByExercise,
  sessionsByExercise,
  focusMeta,
}: {
  exercises: ExerciseLite[];
  lastByExercise: Record<string, LastPerf>;
  sessionsByExercise: Record<string, number>;
  focusMeta: FocusMeta;
}) {
  const [library, setLibrary] = useState(exercises);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [screen, setScreen] = useState<Screen>("focus");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [mode, setMode] = useState<"plan" | "now">("plan");
  const [error, setError] = useState<string | null>(null);

  const workoutIdRef = useRef<string | null>(null);
  const chainRef = useRef<Promise<void>>(Promise.resolve());

  const current = currentIndex != null ? (queue[currentIndex] ?? null) : null;

  function persist(exerciseId: string, sets: SetShape[], startIndex: number, f: Focus) {
    chainRef.current = chainRef.current
      .then(async () => {
        const res = await appendSets({
          workoutId: workoutIdRef.current,
          date: localDateISO(),
          focus: f,
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

  function addExercise(ex: ExerciseLite, initialSets: SetShape[] = []) {
    setLibrary((lib) => (lib.some((e) => e.id === ex.id) ? lib : [...lib, ex]));
    const newIndex = queue.length;
    setQueue((prev) => [
      ...prev.map((it) =>
        it.status === "now" ? { ...it, status: "queued" as const } : it,
      ),
      { exercise: ex, status: "now", sets: [...initialSets] },
    ]);
    setCurrentIndex(newIndex);
    if (initialSets.length && focus) persist(ex.id, initialSets, 0, focus);
    setMode("now");
    setScreen("session");
  }

  function onLogSet(set: SetShape) {
    if (currentIndex == null || !focus) return;
    const startIndex = queue[currentIndex].sets.length;
    const exId = queue[currentIndex].exercise.id;
    setQueue((prev) =>
      prev.map((it, i) => (i === currentIndex ? { ...it, sets: [...it.sets, set] } : it)),
    );
    persist(exId, [set], startIndex, focus);
  }

  function finishExercise() {
    if (currentIndex == null) return;
    const idx = currentIndex;
    const nq = queue.findIndex((it, i) => i !== idx && it.status === "queued");
    setQueue((prev) =>
      prev.map((it, i) => {
        if (i === idx) return { ...it, status: "done" as const };
        if (i === nq) return { ...it, status: "now" as const };
        return it;
      }),
    );
    setCurrentIndex(nq === -1 ? null : nq);
    setMode("plan");
  }

  function jump(i: number) {
    const cur = currentIndex;
    setQueue((prev) =>
      prev.map((it, idx) => {
        if (idx === i) return { ...it, status: "now" as const };
        if (idx === cur && it.status === "now") return { ...it, status: "queued" as const };
        return it;
      }),
    );
    setCurrentIndex(i);
    setMode("now");
  }

  function removeFromQueue(i: number) {
    setQueue((prev) => prev.filter((_, idx) => idx !== i));
    setCurrentIndex((ci) => {
      if (ci == null) return ci;
      if (ci === i) return null;
      return ci > i ? ci - 1 : ci;
    });
  }

  function onShorthand(line: string) {
    const entry = parseLine(line, library, {
      recentExerciseIds: [...queue].reverse().map((q) => q.exercise.id),
    });
    if (entry.match.status === "unknown") {
      void onCreate(entry.phrase || line);
      return;
    }
    const ex =
      entry.match.status === "matched" ? entry.match.exercise : entry.match.candidates[0];
    if (ex) addExercise(ex, entry.sets);
  }

  async function onCreate(name: string) {
    const category = focus && STRENGTH_FOCUSES.includes(focus) ? focus : "push";
    const res = await createExercise({
      name: titleCase(name.trim()),
      category,
      equipment: "machine",
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    addExercise(res.exercise);
  }

  async function onSaveRun(input: RunInput) {
    const res = await saveRun({ date: localDateISO(), ...input });
    if (res.ok) setScreen("focus");
    return res;
  }

  function resetSession() {
    setQueue([]);
    setCurrentIndex(null);
    setFocus(null);
    setMode("plan");
    workoutIdRef.current = null;
    setScreen("focus");
  }

  const queuedIds = new Set(queue.map((q) => q.exercise.id));

  return (
    <div className="relative h-full">
      {screen === "focus" && (
        <FocusView
          meta={focusMeta}
          session={{
            active: queue.length > 0,
            focus,
            done: queue.filter((q) => q.status === "done").length,
          }}
          onPick={(f) => {
            setFocus(f);
            setScreen("picker");
          }}
          onRun={() => setScreen("run")}
          onContinue={() => {
            setScreen("session");
            setMode(current ? "now" : "plan");
          }}
        />
      )}

      {screen === "picker" && focus && (
        <PickerView
          focus={focus}
          library={library}
          lastByExercise={lastByExercise}
          sessionsByExercise={sessionsByExercise}
          queuedIds={queuedIds}
          onSelect={(ex) => addExercise(ex)}
          onShorthand={onShorthand}
          onCreate={(name) => void onCreate(name)}
          onBack={() => setScreen(queue.length ? "session" : "focus")}
        />
      )}

      {screen === "run" && (
        <RunForm onSave={onSaveRun} onBack={() => setScreen("focus")} />
      )}

      {screen === "recap" && focus && (
        <RecapView focus={focus} queue={queue} onDone={resetSession} />
      )}

      {screen === "session" && focus && (
        <div className="flex h-full flex-col">
          <div className="mx-7 mt-[max(1rem,env(safe-area-inset-top))] flex rounded-control bg-surface p-0.5 text-sm">
            <button
              type="button"
              onClick={() => setMode("plan")}
              className={`flex-1 rounded-[10px] py-1.5 ${
                mode === "plan" ? "bg-bg text-text" : "text-text-muted"
              }`}
            >
              Plan
            </button>
            <button
              type="button"
              onClick={() => current && setMode("now")}
              disabled={!current}
              className={`flex-1 rounded-[10px] py-1.5 ${
                mode === "now" ? "bg-bg text-text" : "text-text-muted"
              } disabled:opacity-40`}
            >
              Now
            </button>
          </div>

          <div className="min-h-0 flex-1">
            {mode === "now" && current ? (
              <NowView
                key={current.exercise.id}
                exercise={current.exercise}
                sets={current.sets}
                last={lastByExercise[current.exercise.id]}
                onLogSet={onLogSet}
                onFinish={finishExercise}
              />
            ) : (
              <PlanView
                focus={focus}
                queue={queue}
                onJump={jump}
                onRemove={removeFromQueue}
                onAdd={() => setScreen("picker")}
                onFinish={() => setScreen("recap")}
              />
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="fixed inset-x-0 bottom-20 z-50 mx-auto max-w-md px-7">
          <button
            type="button"
            onClick={() => setError(null)}
            className="w-full rounded-control bg-surface px-4 py-2 text-center text-xs text-red-400"
          >
            {error} — tap to dismiss
          </button>
        </div>
      )}
    </div>
  );
}
