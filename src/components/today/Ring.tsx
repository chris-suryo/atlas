"use client";

import type { ReactNode } from "react";

/**
 * A monochrome progress ring (design §7.7). Color comes from a text token via
 * `currentColor` — tokens only, no hex. `zone` draws a faint band (strain's
 * optimal-zone arc). SVG is rotated so 0 starts at 12 o'clock.
 */
export default function Ring({
  size = 74,
  stroke = 6,
  progress,
  tone = "accent",
  zone,
  children,
}: {
  size?: number;
  stroke?: number;
  progress: number; // 0..1
  tone?: "accent" | "text" | "faint";
  zone?: [number, number]; // [lo, hi] fractions, a faint band
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  const dash = p * c;
  const m = 3; // viewBox margin so round stroke caps never clip at a scroll edge
  const toneClass =
    tone === "accent" ? "text-accent" : tone === "faint" ? "text-text-faint" : "text-text";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`${-m} ${-m} ${size + 2 * m} ${size + 2 * m}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-line"
        />
        {zone && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeDasharray={`${(zone[1] - zone[0]) * c} ${c}`}
            strokeDashoffset={-zone[0] * c}
            className="text-text-faint"
          />
        )}
        {p > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
            className={toneClass}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        {children}
      </div>
    </div>
  );
}
