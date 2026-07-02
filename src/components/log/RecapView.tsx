"use client";

import type { Focus, QueueItem } from "@/app/(app)/log/types";
import { summarizeSets } from "@/app/(app)/log/util";

const LABEL: Record<string, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  core: "Core",
  mobility: "Mobility",
  anything: "Anything",
};

export default function RecapView({
  focus,
  queue,
  onDone,
}: {
  focus: Focus;
  queue: QueueItem[];
  onDone: () => void;
}) {
  const done = queue.filter((q) => q.sets.length > 0);
  const totalSets = done.reduce((n, q) => n + q.sets.length, 0);
  const tonnage = done.reduce(
    (v, q) => v + q.sets.reduce((s, x) => s + (x.weight_lbs ?? 0) * (x.reps ?? 0), 0),
    0,
  );

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-7 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <h1 className="text-[26px] font-medium tracking-tight">Nice work.</h1>
        <p className="mt-1 text-sm text-text-muted">
          {LABEL[focus]} · {done.length} exercises · {totalSets} sets ·{" "}
          {tonnage >= 1000 ? `${(tonnage / 1000).toFixed(1)}k` : tonnage} lb
        </p>

        <div className="mt-8">
          {done.map((q, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 border-t border-line py-3 text-sm"
            >
              {q.exercise.is_anchor && (
                <span className="block h-[7px] w-[7px] shrink-0 rotate-45 bg-accent" />
              )}
              <span className="flex-1 text-text">{q.exercise.name}</span>
              <span className="text-text-faint">{summarizeSets(q.sets)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-7 py-3.5">
        <button
          type="button"
          onClick={onDone}
          className="w-full rounded-control bg-accent px-4 py-3.5 font-medium text-accent-ink"
        >
          Done
        </button>
      </div>
    </div>
  );
}
