"use client";

import { useState, type InputHTMLAttributes } from "react";
import { IconArrowLeft } from "@tabler/icons-react";

export type RunInput = {
  distance_miles: number | null;
  duration_sec: number | null;
  pace_min_per_mile: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  elevation_gain_ft: number | null;
  ankle_pain_0_10: number | null;
  lateral_tightness_0_10: number | null;
  symptom_trend: string | null;
  perceived_effort: number | null;
};

const num = (s: string): number | null => {
  const n = parseFloat(s);
  return s.trim() === "" || Number.isNaN(n) ? null : n;
};
function durationToSec(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  if (t.includes(":")) {
    const [m, sec] = t.split(":");
    const mm = parseInt(m, 10);
    const ss = parseInt(sec ?? "0", 10);
    if (Number.isNaN(mm)) return null;
    return mm * 60 + (Number.isNaN(ss) ? 0 : ss);
  }
  const mins = parseFloat(t);
  return Number.isNaN(mins) ? null : Math.round(mins * 60);
}

function Field({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-xs text-text-faint">{label}</span>
      <input
        {...props}
        className="mt-1 w-full border-b border-line bg-transparent py-2 text-[15px] text-text outline-none placeholder:text-text-faint focus:border-accent"
      />
    </label>
  );
}

export default function RunForm({
  onSave,
  onBack,
}: {
  onSave: (input: RunInput) => Promise<{ ok: boolean; error?: string }>;
  onBack: () => void;
}) {
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [avgHr, setAvgHr] = useState("");
  const [ankle, setAnkle] = useState("");
  const [lateral, setLateral] = useState("");
  const [trend, setTrend] = useState<string | null>(null);
  const [effort, setEffort] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSave = distance.trim() !== "" || duration.trim() !== "";

  async function submit() {
    setSaving(true);
    setError(null);
    const distance_miles = num(distance);
    const duration_sec = durationToSec(duration);
    const pace =
      distance_miles && duration_sec ? duration_sec / 60 / distance_miles : null;
    try {
      const res = await onSave({
        distance_miles,
        duration_sec,
        pace_min_per_mile: pace != null ? Math.round(pace * 100) / 100 : null,
        avg_hr: num(avgHr),
        max_hr: null,
        elevation_gain_ft: null,
        ankle_pain_0_10: num(ankle),
        lateral_tightness_0_10: num(lateral),
        symptom_trend: trend,
        perceived_effort: num(effort),
      });
      if (!res.ok) {
        setError(res.error ?? "Could not save.");
        setSaving(false);
      }
    } catch {
      setError("Could not save — check your connection and try again.");
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} aria-label="Back" className="text-text-muted">
            <IconArrowLeft size={22} />
          </button>
          <h1 className="text-[19px] font-medium">Run</h1>
        </div>
        <p className="mt-2 text-xs text-text-faint">
          WHOOP import is coming — log it manually for now.
        </p>

        <div className="mt-6 space-y-5">
          <Field
            label="Distance (mi)"
            inputMode="decimal"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
          />
          <Field
            label="Duration (mm:ss)"
            inputMode="numeric"
            placeholder="28:30"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
          <Field
            label="Avg HR"
            inputMode="numeric"
            value={avgHr}
            onChange={(e) => setAvgHr(e.target.value)}
          />
          <Field
            label="Ankle pain (0–10)"
            inputMode="numeric"
            value={ankle}
            onChange={(e) => setAnkle(e.target.value)}
          />
          <Field
            label="Lateral tightness (0–10)"
            inputMode="numeric"
            value={lateral}
            onChange={(e) => setLateral(e.target.value)}
          />
          <div>
            <span className="text-xs text-text-faint">Symptom trend</span>
            <div className="mt-2 flex gap-2">
              {["worse", "same", "better"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTrend(t)}
                  className={`flex-1 rounded-control border py-2 text-sm capitalize ${
                    trend === t
                      ? "border-accent text-accent"
                      : "border-line text-text-muted"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <Field
            label="Effort (RPE 1–10)"
            inputMode="numeric"
            value={effort}
            onChange={(e) => setEffort(e.target.value)}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </div>

      <div className="px-7 py-3.5">
        <button
          type="button"
          onClick={submit}
          disabled={saving || !canSave}
          className="w-full rounded-control bg-accent px-4 py-3.5 font-medium text-accent-ink disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save run"}
        </button>
      </div>
    </div>
  );
}
