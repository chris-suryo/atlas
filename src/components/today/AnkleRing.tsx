"use client";

const SEG = 10;
const GAP_DEG = 7;

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
 * Tappable 10-segment ankle-pain ring (§7.7). pain 0–10, lower = better; fill
 * grows with pain. Tap a segment → that value; tap the center → 0. Center shows
 * today's value + a short rolling average.
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
  const size = 88;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {Array.from({ length: SEG }, (_, i) => {
            const a0 = i * (360 / SEG) + GAP_DEG / 2;
            const a1 = (i + 1) * (360 / SEG) - GAP_DEG / 2;
            const filled = pain != null && i < pain;
            const d = arc(cx, cy, r, a0, a1);
            return (
              <g
                key={i}
                onClick={() => onTap(i + 1)}
                style={{ cursor: "pointer" }}
                role="button"
                aria-label={`Ankle pain ${i + 1}`}
              >
                <path d={d} fill="none" stroke="transparent" strokeWidth={20} />
                <path
                  d={d}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  className={filled ? "text-accent" : "text-line"}
                />
              </g>
            );
          })}
        </svg>
        <button
          type="button"
          onClick={() => onTap(0)}
          aria-label="Ankle pain 0"
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
        </button>
      </div>
      {avg != null && (
        <span className="mt-1 text-[10px] text-text-faint tabular-nums">
          avg {avg.toFixed(1)}
        </span>
      )}
    </div>
  );
}
