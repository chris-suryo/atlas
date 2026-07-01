"use client";

/**
 * Recovery-vs-strain 14-day trend (§7.7). Populated after WHOOP ingest (two
 * indexed-to-common-base lines: recovery amber, strain bone). Pre-WHOOP it's a
 * graceful empty state — the "am I digging a hole" read lives here once data exists.
 */
export default function RecoveryStrainTrend({ connected = false }: { connected?: boolean }) {
  return (
    <div>
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
      {!connected && (
        <div className="mt-2 flex h-12 items-center justify-center rounded-control border border-line">
          <span className="text-[11px] text-text-faint">Connect WHOOP for the trend</span>
        </div>
      )}
    </div>
  );
}
