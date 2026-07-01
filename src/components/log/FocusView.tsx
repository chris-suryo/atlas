"use client";

import { IconChevronRight } from "@tabler/icons-react";
import {
  STRENGTH_FOCUSES,
  type Focus,
  type FocusMeta,
} from "@/app/(app)/log/types";

const LABEL: Record<string, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  core: "Core",
  mobility: "Mobility",
  anything: "Anything",
  run: "Run",
};

export default function FocusView({
  meta,
  session,
  onPick,
  onRun,
  onContinue,
}: {
  meta: FocusMeta;
  session: { active: boolean; focus: Focus | null; done: number };
  onPick: (f: Focus) => void;
  onRun: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="h-full overflow-y-auto px-7 pb-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <h1 className="text-[26px] font-medium tracking-tight">
        What are you training?
      </h1>

      {session.active && (
        <button
          type="button"
          onClick={onContinue}
          className="mt-6 flex w-full items-center justify-between rounded-control bg-surface px-4 py-3.5 text-left"
        >
          <span className="text-[15px] text-text">
            Continue · {session.focus ? LABEL[session.focus] : "session"}
            <span className="text-text-faint"> · {session.done} done</span>
          </span>
          <IconChevronRight size={18} className="text-text-muted" />
        </button>
      )}

      <div className="mt-8">
        {STRENGTH_FOCUSES.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onPick(f)}
            className="flex w-full items-center justify-between border-t border-line py-4 text-left"
          >
            <span className="text-[19px] font-medium">{LABEL[f]}</span>
            <span
              className={`text-xs ${
                meta[f]?.due ? "text-accent" : "text-text-faint"
              }`}
            >
              {meta[f]?.due ? "due" : (meta[f]?.label ?? "")}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-8">
        <button
          type="button"
          onClick={onRun}
          className="flex w-full items-center justify-between border-t border-line py-4 text-left"
        >
          <span className="text-[19px] font-medium">Run</span>
          <span className="text-xs text-text-faint">import from WHOOP</span>
        </button>
        <button
          type="button"
          onClick={() => onPick("anything")}
          className="flex w-full items-center justify-between border-t border-line py-4 text-left"
        >
          <span className="text-[19px] font-medium">Anything</span>
          <span className="text-xs text-text-faint">browse all</span>
        </button>
      </div>
    </div>
  );
}
