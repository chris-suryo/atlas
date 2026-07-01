"use client";

import { useRef } from "react";
import { IconArrowUp, IconMicrophone } from "@tabler/icons-react";

export default function SetComposer({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex items-center gap-3.5 border-t border-line px-6 py-3.5"
    >
      <button
        type="button"
        aria-label="Speak or type"
        onClick={() => inputRef.current?.focus()}
        className="shrink-0 text-accent"
      >
        <IconMicrophone size={21} />
      </button>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Say or type your set"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        className="min-w-0 flex-1 bg-transparent text-[15px] text-text outline-none placeholder:text-text-faint"
      />
      <button
        type="submit"
        aria-label="Add"
        className="shrink-0 text-text-faint disabled:opacity-40"
        disabled={!value.trim()}
      >
        <IconArrowUp size={19} />
      </button>
    </form>
  );
}
