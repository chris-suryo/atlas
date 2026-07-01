"use client";

import { IconCheck, IconPlus, IconX } from "@tabler/icons-react";
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

export default function PlanView({
  focus,
  queue,
  onJump,
  onRemove,
  onAdd,
  onFinish,
}: {
  focus: Focus;
  queue: QueueItem[];
  onJump: (index: number) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  onFinish: () => void;
}) {
  const doneCount = queue.filter((q) => q.status === "done").length;
  const totalSets = queue.reduce((n, q) => n + q.sets.length, 0);
  const tonnage = queue.reduce(
    (v, q) => v + q.sets.reduce((s, x) => s + (x.weight_lbs ?? 0) * (x.reps ?? 0), 0),
    0,
  );

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-7 pt-4">
        <div className="flex items-baseline justify-between">
          <h1 className="text-[22px] font-medium">{LABEL[focus]}</h1>
          <span className="text-xs text-text-faint">
            {doneCount} done · {totalSets} sets ·{" "}
            {tonnage >= 1000 ? `${(tonnage / 1000).toFixed(1)}k` : tonnage} lb
          </span>
        </div>

        <div className="mt-6">
          {queue.length === 0 && (
            <p className="py-4 text-sm text-text-muted">
              Nothing queued yet. Add your first exercise.
            </p>
          )}
          {queue.map((item, i) => {
            const summary = summarizeSets(item.sets);
            return (
              <div
                key={`${item.exercise.id}-${i}`}
                className="flex items-center gap-2.5 border-t border-line py-3.5"
              >
                {item.exercise.is_anchor && (
                  <span className="block h-[7px] w-[7px] shrink-0 rotate-45 bg-accent" />
                )}
                <button
                  type="button"
                  onClick={() => onJump(i)}
                  className="flex-1 text-left"
                >
                  <span
                    className={`text-[15px] ${
                      item.status === "now"
                        ? "text-accent"
                        : item.status === "done"
                          ? "text-text-muted"
                          : "text-text"
                    }`}
                  >
                    {item.exercise.name}
                  </span>
                  {summary && (
                    <span className="ml-2 text-xs text-text-faint">{summary}</span>
                  )}
                </button>

                {item.status === "done" ? (
                  <IconCheck size={16} className="text-accent" />
                ) : item.status === "now" ? (
                  <span className="text-xs text-accent">now</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onRemove(i)}
                    aria-label="Remove"
                    className="text-text-faint"
                  >
                    <IconX size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-control bg-accent px-4 py-3 font-medium text-accent-ink"
        >
          <IconPlus size={18} /> Add exercise
        </button>
      </div>

      <div className="border-t border-line px-7 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onFinish}
          disabled={totalSets === 0}
          className="w-full py-1 text-center text-sm text-text-muted disabled:opacity-40"
        >
          Finish workout
        </button>
      </div>
    </div>
  );
}
