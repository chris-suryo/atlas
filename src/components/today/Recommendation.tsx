"use client";

import type { Focus } from "@/app/(app)/log/types";

const LABEL: Record<string, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  core: "Core",
  mobility: "Mobility",
  anything: "Anything",
};

/**
 * The light "Recommended today" block (§7.7). Not a coach — it surfaces the
 * §7.3 engine's top focus + a readiness line, with tappable alternates that
 * override the focus before Start.
 */
export default function Recommendation({
  options,
  selected,
  recencyLabel,
  reason,
  onSelect,
}: {
  options: Focus[];
  selected: Focus;
  recencyLabel: string;
  reason: string;
  onSelect: (f: Focus) => void;
}) {
  const others = options.filter((o) => o !== selected);
  return (
    <div className="flex-1">
      <p className="text-[11px] uppercase tracking-wide text-text-faint">
        Recommended today
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-[24px] font-medium tracking-tight">{LABEL[selected]}</span>
        {recencyLabel && (
          <span className="text-xs text-text-faint">{recencyLabel}</span>
        )}
      </div>
      {reason && <p className="mt-0.5 text-[13px] text-text-muted">{reason}</p>}
      {others.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
          <span className="text-text-faint">or</span>
          {others.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onSelect(f)}
              className="text-text-muted"
            >
              {LABEL[f]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
