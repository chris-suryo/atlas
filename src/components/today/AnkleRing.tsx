"use client";

import { useState } from "react";

const SEG = 10;
const GAP_DEG = 7;
const VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const s = polar(cx, cy, r, a0);
  const e = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

/**
 * Ankle-pain ring (§7.7, revised): a closed/display ring (today's value +
 * rolling avg) that opens a tap-to-pick 0–10 chip row on tap — replaces the
 * fiddly per-segment wedge tap. pain 0–10, lower = better; fill grows with
 * pain. The popover floats free of the ring's own narrow column (absolute,
 * not inline) so its chips can be comfortably sized without squeezing the
 * neighboring Recommendation card.
 */
export default function AnkleRing({
  pain,
  avg,
  onTap,
}: {
  pain: number | null;
  avg: number | null;
  onTap: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const size = 88;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;

  function choose(v: number) {
    onTap(v);
    setOpen(false);
  }

  return (
    <div className="relative flex flex-col items-center">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Log ankle pain"
        className="relative"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {Array.from({ length: SEG }, (_, i) => {
            const a0 = i * (360 / SEG) + GAP_DEG / 2;
            const a1 = (i + 1) * (360 / SEG) - GAP_DEG / 2;
            const filled = pain != null && i < pain;
            const d = arc(cx, cy, r, a0, a1);
            return (
              <path
                key={i}
                d={d}
                fill="none"
                stroke="currentColor"
                strokeWidth={stroke}
                strokeLinecap="round"
                className={filled ? "text-accent" : "text-line"}
              />
            );
          })}
        </svg>
        <div
          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center leading-none"
          style={{ width: size * 0.5, height: size * 0.5 }}
        >
          <span
            className={`text-[20px] font-medium tabular-nums ${
              pain != null ? "text-text" : "text-text-faint"
            }`}
          >
            {pain ?? "—"}
          </span>
          <span className="mt-0.5 text-[10px] text-text-faint">Ankle</span>
        </div>
      </button>
      {avg != null && (
        <span className="mt-1 text-[10px] text-text-faint tabular-nums">
          avg {avg.toFixed(1)}
        </span>
      )}

      {open && (
        <div className="absolute right-0 top-0 z-20 w-[212px] rounded-control border border-line bg-surface p-3">
          <p className="text-[10px] text-text-faint">Ankle pain</p>
          <div className="mt-2 grid grid-cols-6 gap-1.5">
            {VALUES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => choose(v)}
                className={`rounded-control border py-1.5 text-[13px] tabular-nums ${
                  pain === v ? "border-accent text-accent" : "border-line text-text-muted"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
