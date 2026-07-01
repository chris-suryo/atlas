"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { localDateISO } from "@/app/(app)/log/util";
import type { Focus } from "@/app/(app)/log/types";
import type { WeekBucket } from "@/lib/config/running";
import type { AnkleDay, RecoveryRow } from "@/lib/data/today";
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

export default function TodayScreen({
  recovery,
  ankleRecent,
  buckets,
  daysLeft,
  recommendation,
  activeFocus,
}: {
  recovery: RecoveryRow | null;
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
      <div className="flex items-start justify-between px-7 pt-[max(1.25rem,env(safe-area-inset-top))]">
        {activeFocus ? (
          <button
            type="button"
            onClick={() => router.push("/log")}
            className="text-left"
          >
            <span className="text-[22px] font-medium tracking-tight">Resume workout</span>
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
        <span className="pt-1 text-[11px] text-text-faint">
          {recovery ? "synced" : "Connect WHOOP"}
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-7 py-4">
        <WhoopRings recovery={recovery} />
        <RecoveryStrainTrend connected={!!recovery} />
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
