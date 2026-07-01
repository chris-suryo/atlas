"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { arrayMove } from "@dnd-kit/sortable";
import { parseLine, type ExerciseLite } from "@/lib/parser";
import type { LastPerf, SetShape } from "@/lib/data/types";
import {
  STRENGTH_FOCUSES,
  type ActiveWorkout,
  type Focus,
  type FocusMeta,
  type QueueItem,
} from "./types";
import { localDateISO } from "./util";
import {
  addToPlan,
  appendSets,
  createExercise,
  finishPlanExercise,
  finishWorkout,
  removeFromPlan,
  reorderPlan,
  saveRun,
  startWorkout,
} from "./actions";
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

const isTemp = (rowId: string) => rowId.startsWith("temp-");

/** Resume: mark the first not-done lift as the client-only "now" once started. */
function initQueue(a: ActiveWorkout | null): QueueItem[] {
  if (!a || !a.started) return a?.queue ?? [];
  const idx = a.queue.findIndex((q) => q.status !== "done");
  if (idx === -1) return a.queue;
  return a.queue.map((q, i) => (i === idx ? { ...q, status: "now" } : q));
}
function initIndex(a: ActiveWorkout | null): number | null {
  if (!a || !a.started) return null;
  const idx = a.queue.findIndex((q) => q.status !== "done");
  return idx === -1 ? null : idx;
}

export default function LogScreen({
  exercises,
  lastByExercise,
  sessionsByExercise,
  focusMeta,
  active,
}: {
  exercises: ExerciseLite[];
  lastByExercise: Record<string, LastPerf>;
  sessionsByExercise: Record<string, number>;
  focusMeta: FocusMeta;
  active: ActiveWorkout | null;
}) {
  const router = useRouter();
  const [library, setLibrary] = useState(exercises);
  const [focus, setFocus] = useState<Focus | null>(active?.focus ?? null);
  const [screen, setScreen] = useState<Screen>(active ? "session" : "focus");
  const [queue, setQueue] = useState<QueueItem[]>(() => initQueue(active));
  const [currentIndex, setCurrentIndex] = useState<number | null>(() =>
    initIndex(active),
  );
  const [mode, setMode] = useState<"plan" | "now">("plan");
  const [started, setStarted] = useState<boolean>(active?.started ?? false);
  const [error, setError] = useState<string | null>(null);

  const workoutIdRef = useRef<string | null>(active?.id ?? null);
  const chainRef = useRef<Promise<void>>(Promise.resolve());
  const tempIdRef = useRef(0);

  const current = currentIndex != null ? (queue[currentIndex] ?? null) : null;

  function chain(fn: () => Promise<void>) {
    chainRef.current = chainRef.current
      .then(fn)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  /** Log a set to the active exercise (workout already exists from the add). */
  function onLogSet(set: SetShape) {
    if (currentIndex == null || !focus) return;
    const startIndex = queue[currentIndex].sets.length;
    const exId = queue[currentIndex].exercise.id;
    const f = focus;
    setQueue((prev) =>
      prev.map((it, i) =>
        i === currentIndex ? { ...it, sets: [...it.sets, set] } : it,
      ),
    );
    chain(async () => {
      const res = await appendSets({
        workoutId: workoutIdRef.current,
        date: localDateISO(),
        focus: f,
        exerciseId: exId,
        sets: [
          {
            weight_lbs: set.weight_lbs,
            reps: set.reps,
            rpe: set.rpe,
            set_index: startIndex,
          },
        ],
      });
      if (res.ok) workoutIdRef.current = res.workoutId;
      else setError(res.error);
    });
  }

  /** Plan-first: queue an exercise and STAY in Plan (no jump to Now). */
  function queueExercise(ex: ExerciseLite, initialSets: SetShape[] = []) {
    if (!focus) return;
    const f = focus;
    setLibrary((lib) => (lib.some((e) => e.id === ex.id) ? lib : [...lib, ex]));
    const orderIndex = queue.length;
    const tempRowId = `temp-${tempIdRef.current++}`;
    setQueue((prev) => [
      ...prev,
      { rowId: tempRowId, exercise: ex, status: "queued", sets: [...initialSets] },
    ]);
    setMode("plan");
    setScreen("session");
    chain(async () => {
      const res = await addToPlan({
        workoutId: workoutIdRef.current,
        date: localDateISO(),
        focus: f,
        exerciseId: ex.id,
        orderIndex,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      workoutIdRef.current = res.workoutId;
      setQueue((prev) =>
        prev.map((it) => (it.rowId === tempRowId ? { ...it, rowId: res.rowId } : it)),
      );
      if (initialSets.length) {
        const setRes = await appendSets({
          workoutId: res.workoutId,
          date: localDateISO(),
          focus: f,
          exerciseId: ex.id,
          sets: initialSets.map((s, i) => ({
            weight_lbs: s.weight_lbs,
            reps: s.reps,
            rpe: s.rpe,
            set_index: i,
          })),
        });
        if (!setRes.ok) setError(setRes.error);
      }
    });
  }

  /** Start the clock and open the first lift in Now. */
  function beginWorkout() {
    if (!queue.length) return;
    const idx = queue.findIndex((q) => q.status !== "done");
    const target = idx === -1 ? 0 : idx;
    setStarted(true);
    setQueue((prev) =>
      prev.map((it, i) => (i === target ? { ...it, status: "now" } : it)),
    );
    setCurrentIndex(target);
    setMode("now");
    chain(async () => {
      const wid = workoutIdRef.current;
      if (!wid) return;
      const res = await startWorkout({ workoutId: wid });
      if (!res.ok) setError(res.error);
    });
  }

  function finishExercise() {
    if (currentIndex == null) return;
    const idx = currentIndex;
    const rowId = queue[idx]?.rowId;
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
    if (rowId && !isTemp(rowId)) {
      chain(async () => {
        const res = await finishPlanExercise({ rowId });
        if (!res.ok) setError(res.error);
      });
    }
  }

  function jump(i: number) {
    if (!started) return;
    const cur = currentIndex;
    setQueue((prev) =>
      prev.map((it, idx) => {
        if (idx === i) return { ...it, status: "now" as const };
        if (idx === cur && it.status === "now")
          return { ...it, status: "queued" as const };
        return it;
      }),
    );
    setCurrentIndex(i);
    setMode("now");
  }

  function removeFromQueue(i: number) {
    const rowId = queue[i]?.rowId;
    setQueue((prev) => prev.filter((_, idx) => idx !== i));
    setCurrentIndex((ci) => {
      if (ci == null) return ci;
      if (ci === i) return null;
      return ci > i ? ci - 1 : ci;
    });
    if (rowId && !isTemp(rowId)) {
      chain(async () => {
        const res = await removeFromPlan({ rowId });
        if (!res.ok) setError(res.error);
      });
    }
  }

  function reorder(activeId: string, overId: string) {
    const from = queue.findIndex((q) => q.rowId === activeId);
    const to = queue.findIndex((q) => q.rowId === overId);
    if (from === -1 || to === -1 || from === to) return;
    const next = arrayMove(queue, from, to);
    setQueue(next);
    setCurrentIndex((ci) => {
      if (ci == null) return ci;
      const curRow = queue[ci]?.rowId;
      const i = next.findIndex((q) => q.rowId === curRow);
      return i === -1 ? ci : i;
    });
    const rows = next
      .map((it, i) => ({ id: it.rowId, order_index: i }))
      .filter((r) => !isTemp(r.id));
    chain(async () => {
      const res = await reorderPlan({ rows });
      if (!res.ok) setError(res.error);
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
      entry.match.status === "matched"
        ? entry.match.exercise
        : entry.match.candidates[0];
    if (ex) queueExercise(ex, entry.sets);
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
    queueExercise(res.exercise);
  }

  async function onSaveRun(input: RunInput) {
    const res = await saveRun({ date: localDateISO(), ...input });
    if (res.ok) setScreen("focus");
    return res;
  }

  /** After Finish → recap → Done: clear the session and land on Today. */
  function resetSession() {
    setQueue([]);
    setCurrentIndex(null);
    setFocus(null);
    setMode("plan");
    setStarted(false);
    workoutIdRef.current = null;
    setScreen("focus");
    router.push("/today");
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
            setMode(started && current ? "now" : "plan");
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
          onSelect={(ex) => queueExercise(ex)}
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
          {started && (
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
                onClick={() => {
                  if (current) {
                    setMode("now");
                    return;
                  }
                  const idx = queue.findIndex((q) => q.status !== "done");
                  if (idx !== -1) jump(idx);
                }}
                className={`flex-1 rounded-[10px] py-1.5 ${
                  mode === "now" ? "bg-bg text-text" : "text-text-muted"
                }`}
              >
                Now
              </button>
            </div>
          )}

          <div className="min-h-0 flex-1">
            {started && mode === "now" && current ? (
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
                started={started}
                onJump={jump}
                onRemove={removeFromQueue}
                onReorder={reorder}
                onAdd={() => setScreen("picker")}
                onStart={beginWorkout}
                onFinish={() => {
                  setScreen("recap");
                  chain(async () => {
                    const wid = workoutIdRef.current;
                    if (!wid) return;
                    const res = await finishWorkout({ workoutId: wid });
                    if (!res.ok) setError(res.error);
                  });
                }}
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
