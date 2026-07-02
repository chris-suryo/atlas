"use client";

import type { RecoveryPoint } from "@/lib/data/today";

const MAX_STRAIN = 21;

/** "6/28" from a YYYY-MM-DD string — pure string split, no Date/timezone risk. */
function shortLabel(dateISO: string): string {
  const [, m, d] = dateISO.split("-");
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
}

/**
 * Recovery-vs-strain 14-day trend (§7.7). Two lines on ONE common 0–100 axis
 * (recovery %, strain indexed as %-of-21) — not a dual-axis chart. Recovery is
 * amber, strain is bone. Graceful empty state until WHOOP is connected.
 */
export default function RecoveryStrainTrend({
  points,
  connected,
}: {
  points: RecoveryPoint[];
  connected: boolean;
}) {
  const header = (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-medium text-text-muted">
        Recovery vs strain · 14d
      </span>
      <span className="flex items-center gap-3 text-[10px] text-text-faint">
        <span className="flex items-center gap-1">
          <span className="h-0.5 w-3 rounded-full bg-accent" /> recovery
        </span>
        <span className="flex items-center gap-1">
          <span className="h-0.5 w-3 rounded-full bg-text" /> strain
        </span>
      </span>
    </div>
  );

  const usable = points.filter((p) => p.recovery_pct != null || p.strain != null);
  if (!connected || usable.length < 2) {
    return (
      <div>
        {header}
        <div className="mt-2 flex h-12 items-center justify-center rounded-control border border-line">
          <span className="text-[11px] text-text-faint">
            {connected ? "Building your trend…" : "Connect WHOOP for the trend"}
          </span>
        </div>
      </div>
    );
  }

  const W = 300;
  const H = 62;
  const padX = 2;
  const padT = 4;
  const padB = 14;
  const chartH = H - padT - padB;
  const n = points.length;
  const x = (i: number) => padX + (W - 2 * padX) * (n === 1 ? 0 : i / (n - 1));
  const y = (pct: number) => padT + chartH * (1 - Math.max(0, Math.min(100, pct)) / 100);
  const line = (get: (p: RecoveryPoint) => number | null) =>
    points
      .map((p, i) => {
        const v = get(p);
        return v == null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      })
      .filter(Boolean)
      .join(" ");
  const tickIdx = [...new Set([0, Math.round((n - 1) / 3), Math.round((2 * (n - 1)) / 3), n - 1])];
  const tickAnchor = (i: number) => (i === 0 ? "start" : i === n - 1 ? "end" : "middle");

  return (
    <div>
      {header}
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full" role="img" aria-label="Recovery vs strain">
        <polyline
          points={line((p) => (p.strain == null ? null : (p.strain / MAX_STRAIN) * 100))}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
          className="text-text"
        />
        <polyline
          points={line((p) => p.recovery_pct)}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
          className="text-accent"
        />
        {tickIdx.map((i) => (
          <text
            key={`t${i}`}
            x={x(i)}
            y={H - 3}
            textAnchor={tickAnchor(i)}
            fill="currentColor"
            className="text-text-faint"
            style={{ fontSize: 9 }}
          >
            {shortLabel(points[i].date)}
          </text>
        ))}
      </svg>
    </div>
  );
}
