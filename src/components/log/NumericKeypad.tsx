"use client";

import { IconBackspace, IconMicrophone } from "@tabler/icons-react";

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"];

export default function NumericKeypad({
  field,
  onDigit,
  onBackspace,
  onLogSet,
  onVoice,
  canLog,
}: {
  field: "weight" | "reps";
  onDigit: (d: string) => void;
  onBackspace: () => void;
  onLogSet: () => void;
  onVoice: () => void;
  canLog: boolean;
}) {
  return (
    <div className="border-t border-line px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3.5">
      <div className="flex items-center justify-between px-2 pb-2 text-xs text-text-faint">
        <span>
          Editing <span className="text-accent">{field}</span>
        </span>
        <button
          type="button"
          onClick={onVoice}
          aria-label="Type or speak instead"
          className="text-text-muted"
        >
          <IconMicrophone size={18} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-0.5">
        {DIGITS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onDigit(d)}
            className="flex h-[52px] items-center justify-center rounded-control text-[23px] text-text active:bg-line"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={onBackspace}
          aria-label="Delete"
          className="flex h-[52px] items-center justify-center rounded-control text-text-muted active:bg-line"
        >
          <IconBackspace size={22} />
        </button>
      </div>

      <button
        type="button"
        onClick={onLogSet}
        disabled={!canLog}
        className="mt-2.5 w-full rounded-control bg-accent px-4 py-3.5 text-base font-medium text-accent-ink transition-opacity disabled:opacity-40"
      >
        Log set
      </button>
    </div>
  );
}
