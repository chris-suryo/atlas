"use client";

/**
 * Fuel (§7.7) — kcal vs target. Static stub for M1; the CalTrak daily total +
 * "Log food" deep-link are a post-WHOOP fast-follow.
 */
export default function FuelBar({ target = 2200 }: { target?: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-medium text-text-muted">Fuel</span>
        <span className="text-[10px] text-text-faint tabular-nums">
          — / {target} kcal
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-3">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-line" />
        <button type="button" disabled className="text-[11px] text-text-faint">
          Log food
        </button>
      </div>
    </div>
  );
}
