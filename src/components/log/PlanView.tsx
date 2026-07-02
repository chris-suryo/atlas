"use client";

import {
  IconCheck,
  IconGripVertical,
  IconPlus,
  IconX,
} from "@tabler/icons-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ExerciseLite } from "@/lib/parser";
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

function PlanRow({
  item,
  index,
  onJump,
  onRemove,
}: {
  item: QueueItem;
  index: number;
  onJump: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  const done = item.status === "done";
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.rowId, disabled: done });
  const summary = summarizeSets(item.sets);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
      className="flex items-center gap-2 border-t border-line py-3.5"
    >
      {done ? (
        <span className="w-4 shrink-0" />
      ) : (
        <button
          type="button"
          aria-label="Drag to reorder"
          className="shrink-0 cursor-grab touch-none text-text-faint"
          {...attributes}
          {...listeners}
        >
          <IconGripVertical size={16} />
        </button>
      )}

      {item.exercise.is_anchor && (
        <span className="block h-[7px] w-[7px] shrink-0 rotate-45 bg-accent" />
      )}
      <button type="button" onClick={() => onJump(index)} className="flex-1 text-left">
        <span
          className={`text-[15px] ${
            item.status === "now"
              ? "text-accent"
              : done
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

      {done ? (
        <IconCheck size={16} className="text-accent" />
      ) : item.status === "now" ? (
        <span className="text-xs text-accent">now</span>
      ) : (
        <button
          type="button"
          onClick={() => onRemove(index)}
          aria-label="Remove"
          className="text-text-faint"
        >
          <IconX size={16} />
        </button>
      )}
    </div>
  );
}

export default function PlanView({
  focus,
  queue,
  started,
  upNext,
  onJump,
  onRemove,
  onReorder,
  onAdd,
  onAddSuggestion,
  onStart,
  onFinish,
}: {
  focus: Focus;
  queue: QueueItem[];
  started: boolean;
  upNext: { ex: ExerciseLite; reason: string }[];
  onJump: (index: number) => void;
  onRemove: (index: number) => void;
  onReorder: (activeId: string, overId: string) => void;
  onAdd: () => void;
  onAddSuggestion: (ex: ExerciseLite) => void;
  onStart: () => void;
  onFinish: () => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const doneCount = queue.filter((q) => q.status === "done").length;
  const totalSets = queue.reduce((n, q) => n + q.sets.length, 0);
  const tonnage = queue.reduce(
    (v, q) => v + q.sets.reduce((s, x) => s + (x.weight_lbs ?? 0) * (x.reps ?? 0), 0),
    0,
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      onReorder(String(active.id), String(over.id));
    }
  }

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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            autoScroll={false}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={queue.map((q) => q.rowId)}
              strategy={verticalListSortingStrategy}
            >
              {queue.map((item, i) => (
                <PlanRow
                  key={item.rowId}
                  item={item}
                  index={i}
                  onJump={onJump}
                  onRemove={onRemove}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {upNext.length > 0 && (
          <div className="mt-7">
            <p className="text-xs uppercase tracking-wide text-text-faint">Up next</p>
            {upNext.map(({ ex, reason }) => (
              <div
                key={ex.id}
                className="flex items-center gap-2.5 border-t border-line py-3"
              >
                {ex.is_anchor && (
                  <span className="block h-[7px] w-[7px] shrink-0 rotate-45 bg-accent" />
                )}
                <span className="flex-1 text-[15px] text-text-muted">{ex.name}</span>
                <span className="text-xs text-text-faint">{reason}</span>
                <button
                  type="button"
                  onClick={() => onAddSuggestion(ex)}
                  aria-label={`Add ${ex.name}`}
                  className="text-accent"
                >
                  <IconPlus size={18} />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onAdd}
          className={`mt-6 flex w-full items-center justify-center gap-2 rounded-control px-4 py-3 font-medium ${
            started || queue.length === 0
              ? "bg-accent text-accent-ink"
              : "border border-line text-text-muted"
          }`}
        >
          <IconPlus size={18} /> Add exercise
        </button>
      </div>

      <div className="border-t border-line px-7 py-3.5">
        {started ? (
          <button
            type="button"
            onClick={onFinish}
            disabled={totalSets === 0}
            className="w-full py-1 text-center text-sm text-text-muted disabled:opacity-40"
          >
            Finish workout
          </button>
        ) : (
          <button
            type="button"
            onClick={onStart}
            disabled={queue.length === 0}
            className="w-full rounded-control bg-accent px-4 py-3.5 font-medium text-accent-ink disabled:opacity-40"
          >
            Start workout
          </button>
        )}
      </div>
    </div>
  );
}
