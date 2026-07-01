"use client";

import { useState } from "react";
import { IconArrowLeft, IconPlus, IconSearch } from "@tabler/icons-react";
import type { ExerciseLite } from "@/lib/parser";
import type { LastPerf } from "@/lib/data/types";
import type { Focus } from "@/app/(app)/log/types";

const LABEL: Record<string, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  core: "Core",
  mobility: "Mobility",
  anything: "Anything",
};

export default function PickerView({
  focus,
  library,
  lastByExercise,
  sessionsByExercise,
  queuedIds,
  onSelect,
  onShorthand,
  onCreate,
  onBack,
}: {
  focus: Focus;
  library: ExerciseLite[];
  lastByExercise: Record<string, LastPerf>;
  sessionsByExercise: Record<string, number>;
  queuedIds: Set<string>;
  onSelect: (ex: ExerciseLite) => void;
  onShorthand: (line: string) => void;
  onCreate: (name: string) => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const pool =
    focus === "anything" ? library : library.filter((e) => e.category === focus);
  const matches =
    q === ""
      ? pool
      : pool.filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.aliases.some((a) => a.includes(q)),
        );
  const sorted = [...matches].sort((a, b) => {
    const fa = sessionsByExercise[a.id] ?? 0;
    const fb = sessionsByExercise[b.id] ?? 0;
    if (fb !== fa) return fb - fa;
    if (a.is_anchor !== b.is_anchor) return a.is_anchor ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  const showCreate = q !== "" && matches.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div className="px-7 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} aria-label="Back" className="text-text-muted">
            <IconArrowLeft size={22} />
          </button>
          <h1 className="text-[19px] font-medium">Add to {LABEL[focus]}</h1>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (q) onShorthand(query.trim());
          }}
          className="mt-4 flex items-center gap-2.5 border-b border-line py-2"
        >
          <IconSearch size={18} className="shrink-0 text-text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search — or type a full set"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-text outline-none placeholder:text-text-faint"
          />
        </form>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-6">
        {sorted.map((ex) => {
          const summary = lastByExercise[ex.id]?.summary;
          return (
            <button
              key={ex.id}
              type="button"
              onClick={() => onSelect(ex)}
              className="flex w-full items-center gap-2.5 border-t border-line py-3.5 text-left"
            >
              {ex.is_anchor && (
                <span className="block h-[7px] w-[7px] shrink-0 rotate-45 bg-accent" />
              )}
              <span className="flex-1 text-[15px] text-text">{ex.name}</span>
              {summary && (
                <span className="text-xs text-text-faint">last {summary}</span>
              )}
              {queuedIds.has(ex.id) && (
                <span className="ml-3 text-xs text-accent">queued</span>
              )}
            </button>
          );
        })}

        {showCreate && (
          <button
            type="button"
            onClick={() => onCreate(query.trim())}
            className="flex w-full items-center gap-2.5 border-t border-line py-3.5 text-left text-text-muted"
          >
            <IconPlus size={16} className="shrink-0" />
            <span className="text-[15px]">Create “{query.trim()}”</span>
          </button>
        )}
      </div>
    </div>
  );
}
