"use client";

import { IconFlag } from "@tabler/icons-react";
import type { WeekBucket } from "@/lib/config/running";

/**
 * "Road to Cambridge" weekly-mileage chart (§7.7): actual weekly miles (bars,
 * current week amber) vs a dashed rising plan target, plus the race countdown.
 * Hand-rolled inline SVG — tokens only via currentColor.
 */
export default function MileageChart({
  buckets,
  daysLeft,
}: {
  buckets: WeekBucket[];
  daysLeft: number;
}) {
  const W = 300;
  const H = 92;
  const padL = 6;
  const padR = 6;
  const padT = 14;
  const padB = 12;
  const chartH = H - padT - padB;
  const n = Math.max(1, buckets.length);
  const slot = (W - padL - padR) / n;
  const barW = Math.min(18, slot * 0.5);
  const maxY = Math.max(1, ...buckets.map((b) => Math.max(b.miles, b.target)));
  const x = (i: number) => padL + slot * i + slot / 2;
  const y = (v: number) => padT + chartH * (1 - v / maxY);
  const hasRuns = buckets.some((b) => b.miles > 0);
  const targetPts = buckets.map((b, i) => `${x(i).toFixed(1)},${y(b.target).toFixed(1)}`).join(" ");

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-text-muted">Road to Cambridge</span>
        <span className="flex items-center gap-1 text-[11px] text-accent tabular-nums">
          <IconFlag size={12} /> {daysLeft}d
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full" role="img" aria-label="Weekly mileage vs target">
        <line
          x1={padL}
          y1={padT + chartH}
          x2={W - padR}
          y2={padT + chartH}
          stroke="currentColor"
          strokeWidth={1}
          className="text-line"
        />
        {buckets.map((b, i) =>
          b.miles > 0 ? (
            <rect
              key={`b${i}`}
              x={x(i) - barW / 2}
              y={y(b.miles)}
              width={barW}
              height={padT + chartH - y(b.miles)}
              rx={3}
              fill="currentColor"
              className={b.isCurrent ? "text-accent" : "text-text-muted"}
            />
          ) : null,
        )}
        <polyline
          points={targetPts}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeDasharray="3 3"
          className="text-text-faint"
        />
        {buckets.map((b, i) =>
          b.isCurrent && b.miles > 0 ? (
            <text
              key={`v${i}`}
              x={x(i)}
              y={y(b.miles) - 4}
              textAnchor="middle"
              fill="currentColor"
              className="text-accent"
              style={{ fontSize: 9 }}
            >
              {b.miles}
            </text>
          ) : null,
        )}
      </svg>

      <div className="flex items-center justify-between text-[10px] text-text-faint">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-sm bg-accent" /> weekly miles
        </span>
        <span className="flex items-center gap-1">
          <span className="h-px w-3 bg-text-faint" /> target
        </span>
      </div>
      {!hasRuns && (
        <p className="mt-1 text-center text-[11px] text-text-faint">
          Log a run to start your chart
        </p>
      )}
    </div>
  );
}
