"use client";

import type { ReactNode } from "react";
import Ring from "./Ring";
import type { RecoveryRow } from "@/lib/data/today";

function fmtSleep(hours: number | null): string {
  if (hours == null) return "—";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h${m < 10 ? "0" : ""}${m}`;
}

function Cell({
  label,
  sub,
  children,
}: {
  label: string;
  sub: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5">
      {children}
      <span className="text-[11px] font-medium text-text-muted">{label}</span>
      <span className="text-[10px] text-text-faint tabular-nums">{sub}</span>
    </div>
  );
}

/**
 * Sleep · Recovery · Strain (§7.7). Recovery is the amber ring; Sleep + Strain
 * are bone. Pre-WHOOP (`recovery` is null) shows a graceful "Connect WHOOP"
 * empty state — muted rings with "—", never zeros.
 */
export default function WhoopRings({ recovery }: { recovery: RecoveryRow | null }) {
  if (!recovery) {
    return (
      <div>
        <div className="flex items-start">
          {(["Sleep", "Recovery", "Strain"] as const).map((label) => (
            <Cell key={label} label={label} sub="—">
              <Ring progress={0} tone="faint">
                <span className="text-[15px] text-text-faint">—</span>
              </Ring>
            </Cell>
          ))}
        </div>
        <a
          href="/api/whoop/authorize"
          className="mt-2 block text-center text-[11px] text-accent"
        >
          Connect WHOOP to see sleep, recovery &amp; strain
        </a>
      </div>
    );
  }

  const rec = recovery.recovery_pct ?? 0;
  const strain = recovery.strain ?? 0;
  return (
    <div className="flex items-start">
      <Cell label="Sleep" sub={`${Math.round(recovery.sleep_perf ?? 0)}% of need`}>
        <Ring progress={(recovery.sleep_perf ?? 0) / 100} tone="text">
          <span className="text-[15px] font-medium tabular-nums">
            {fmtSleep(recovery.sleep_hours)}
          </span>
        </Ring>
      </Cell>
      <Cell
        label="Recovery"
        sub={`HRV ${Math.round(recovery.hrv ?? 0)} · RHR ${recovery.rhr ?? "—"}`}
      >
        <Ring progress={rec / 100} tone="accent">
          <span className="text-[16px] font-medium tabular-nums text-accent">
            {Math.round(rec)}%
          </span>
        </Ring>
      </Cell>
      <Cell label="Strain" sub="target 10–14">
        <Ring progress={strain / 21} tone="text" zone={[10 / 21, 14 / 21]}>
          <span className="text-[15px] font-medium tabular-nums">
            {strain.toFixed(1)}
          </span>
        </Ring>
      </Cell>
    </div>
  );
}
