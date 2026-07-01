"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { localDateISO } from "@/app/(app)/log/util";
import type { Focus } from "@/app/(app)/log/types";
import type { WeekBucket } from "@/lib/config/running";
import type {
  AnkleDay,
  RecoveryPoint,
  RecoveryRow,
  WhoopStatus,
} from "@/lib/data/today";
import { logAnklePain } from "@/app/(app)/today/actions";
import WhoopRings from "./WhoopRings";
import RecoveryStrainTrend from "./RecoveryStrainTrend";
import FuelBar from "./FuelBar";
import Recommendation from "./Recommendation";
import AnkleRing from "./AnkleRing";
import MileageChart from "./MileageChart";

const LABEL: Record<string, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  core: "Core",
  mobility: "Mobility",
  anything: "Anything",
};

// Kept out of render scope (react-hooks/purity): wall-clock helpers.
function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
function dateLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
const WHOOP_NOTICE: Record<string, { text: string; ok: boolean }> = {
  connected: { text: "WHOOP connected", ok: true },
  synced: { text: "WHOOP synced", ok: true },
  disconnected: { text: "WHOOP disconnected", ok: true },
  state: { text: "Connect failed: security check (state) — try again", ok: false },
  unconfigured: { text: "Connect failed: server not configured", ok: false },
  token: { text: "Connect failed: WHOOP token exchange (check client secret / redirect URI)", ok: false },
  store: { text: "Connect failed: saving tokens", ok: false },
  error: { text: "WHOOP sync failed — check logs", ok: false },
};

function syncedAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "synced just now";
  if (mins < 60) return `synced ${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `synced ${hrs}h ago`;
  return `synced ${Math.round(hrs / 24)}d ago`;
}

export default function TodayScreen({
  recovery,
  recoverySeries,
  whoop,
  ankleRecent,
  buckets,
  daysLeft,
  recommendation,
  activeFocus,
  whoopNotice,
}: {
  recovery: RecoveryRow | null;
  recoverySeries: RecoveryPoint[];
  whoop: WhoopStatus;
  ankleRecent: AnkleDay[];
  buckets: WeekBucket[];
  daysLeft: number;
  recommendation: {
    focus: Focus;
    alternates: Focus[];
    recencyLabel: string;
    reason: string;
  };
  activeFocus: Focus | null;
  whoopNotice: string | null;
}) {
  const router = useRouter();
  const [greet] = useState(greeting);
  const [date] = useState(dateLabel);
  const [todayISO] = useState(localDateISO);
  const [selected, setSelected] = useState<Focus>(recommendation.focus);
  const [todayPain, setTodayPain] = useState<number | null>(
    () => ankleRecent.find((a) => a.date === localDateISO())?.pain_0_10 ?? null,
  );

  const options = [recommendation.focus, ...recommendation.alternates].filter(
    (f, i, a) => a.indexOf(f) === i,
  );

  const painByDate = new Map(ankleRecent.map((a) => [a.date, a.pain_0_10]));
  if (todayPain != null) painByDate.set(todayISO, todayPain);
  const painVals = [...painByDate.values()].filter((v): v is number => v != null);
  const ankleAvg = painVals.length
    ? painVals.reduce((s, v) => s + v, 0) / painVals.length
    : null;

  function tapAnkle(v: number) {
    setTodayPain(v);
    void logAnklePain({ date: todayISO, pain: v });
  }
  function start() {
    router.push(activeFocus ? "/log" : `/log?focus=${selected}`);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-start justify-between px-7 pt-[max(1.25rem,env(safe-area-inset-top))]">
        {activeFocus ? (
          <button
            type="button"
            onClick={() => router.push("/log")}
            className="text-left"
          >
            <span className="text-[17px] font-medium tracking-tight">Resume workout</span>
            <span className="block text-xs text-text-faint">
              {LABEL[activeFocus]} in progress
            </span>
          </button>
        ) : (
          <div>
            <h1 className="text-[22px] font-medium tracking-tight">{greet}</h1>
            <p className="text-xs text-text-faint">{date}</p>
          </div>
        )}
        {whoop.connected ? (
          <form action="/api/whoop/sync" method="post" className="pt-1 text-right">
            <button type="submit" className="text-[11px] text-accent">
              Sync
            </button>
            {whoop.lastSyncedAt && (
              <span className="block text-[10px] text-text-faint">
                {syncedAgo(whoop.lastSyncedAt)}
              </span>
            )}
          </form>
        ) : (
          <a href="/api/whoop/authorize" className="pt-1 text-[11px] text-accent">
            Connect WHOOP
          </a>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-7 pb-4 pt-3">
        {whoopNotice && WHOOP_NOTICE[whoopNotice] && (
          <p
            className={`rounded-control px-3 py-2 text-center text-[11px] ${
              WHOOP_NOTICE[whoopNotice].ok
                ? "text-text-muted"
                : "border border-line text-accent"
            }`}
          >
            {WHOOP_NOTICE[whoopNotice].text}
          </p>
        )}
        <WhoopRings recovery={recovery} />
        <RecoveryStrainTrend points={recoverySeries} connected={whoop.connected} />
        {whoop.connected && (
          <form action="/api/whoop/disconnect" method="post" className="-mt-3 text-center">
            <button type="submit" className="text-[10px] text-text-faint">
              Disconnect WHOOP
            </button>
          </form>
        )}
        <FuelBar />
        <div className="flex items-start justify-between gap-4">
          <Recommendation
            options={options}
            selected={selected}
            recencyLabel={recommendation.recencyLabel}
            reason={recommendation.reason}
            onSelect={setSelected}
          />
          <AnkleRing pain={todayPain} avg={ankleAvg} onTap={tapAnkle} />
        </div>
        <MileageChart buckets={buckets} daysLeft={daysLeft} />
      </div>

      <div className="border-t border-line px-7 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={start}
          className="w-full rounded-control bg-accent px-4 py-3.5 font-medium text-accent-ink"
        >
          {activeFocus ? "Resume workout" : "Start workout"}
        </button>
      </div>
    </div>
  );
}
