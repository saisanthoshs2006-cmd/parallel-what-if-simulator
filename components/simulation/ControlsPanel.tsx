"use client";

import { useState } from "react";
import { Check, Link2, Play, RotateCcw, Square } from "lucide-react";
import { useSim, useSimStoreApi } from "@/store/simulation-store";
import { buildShareUrl } from "@/lib/simulation/scenario-url";
import { ASSUMPTIONS } from "@/lib/config/assumptions";
import { MAX_NAME_LENGTH } from "@/lib/simulation/scenario-url";
import type { SimulationResult } from "@/lib/simulation/types";
import { Segmented } from "@/components/ui/Segmented";

export function ControlsPanel({
  scenario,
  demo,
}: {
  scenario: SimulationResult;
  demo: { playing: boolean; play: () => void; stop: () => void };
}) {
  const name = useSim((s) => s.name);
  const pct = useSim((s) => s.conversionPct);
  const view = useSim((s) => s.view);
  const canopy = useSim((s) => s.canopy);
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle");
  const api = useSimStoreApi();
  const st = api.getState;

  async function share() {
    const s = st();
    const url = buildShareUrl(window.location.origin, window.location.pathname, s);
    try {
      await navigator.clipboard.writeText(url);
      setCopied("ok");
    } catch {
      window.prompt("Copy this scenario link:", url);
      setCopied("fail");
    }
    setTimeout(() => setCopied("idle"), 2200);
  }

  return (
    <aside
      aria-label="Scenario controls"
      className="scroll-thin flex flex-col gap-7 overflow-y-auto border-b border-line bg-panel p-6 lg:border-r lg:border-b-0"
    >
      <header>
        <div className="flex items-center gap-2.5">
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
            <rect x="2" y="2" width="8" height="8" rx="1.5" fill="#5fd38d" />
            <rect x="12" y="2" width="8" height="8" rx="1.5" fill="none" stroke="#5f6b78" strokeWidth="1.5" />
            <rect x="2" y="12" width="8" height="8" rx="1.5" fill="none" stroke="#5f6b78" strokeWidth="1.5" />
            <rect x="12" y="12" width="8" height="8" rx="1.5" fill="#d9a441" />
          </svg>
          <h1 className="text-lg font-semibold tracking-tight">Parallel</h1>
        </div>
        <p className="mt-1.5 text-[13px] text-mute">Rewrite your city. Explore tomorrow.</p>
      </header>

      <div>
        <label htmlFor="scenario-name" className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-dim">
          Scenario
        </label>
        <input
          id="scenario-name"
          value={name}
          maxLength={MAX_NAME_LENGTH}
          onChange={(e) => st().setName(e.target.value)}
          className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-dim focus:border-leaf/50 focus:outline-none"
        />
      </div>

      <section aria-labelledby="slider-label">
        <div className="mb-1 flex items-baseline justify-between">
          <label id="slider-label" htmlFor="conversion" className="text-sm font-medium">
            Parking converted to green
          </label>
          <output htmlFor="conversion" className="font-mono text-2xl font-semibold tabular-nums text-leaf">
            {pct}%
          </output>
        </div>
        <div className="relative">
          <input
            id="conversion"
            type="range"
            min={0}
            max={100}
            step={1}
            value={pct}
            className="parallel-range"
            style={{ ["--fill" as string]: `${pct}%` }}
            aria-valuetext={`${pct} percent: ${scenario.convertedCount} of ${scenario.totalSpaces} parking spaces converted${
              scenario.unaccommodatedDemand > 0 ? `; ${scenario.unaccommodatedDemand} assumed cars without a space` : ""
            }`}
            onChange={(e) => {
              demo.stop();
              st().setConversion(Number(e.target.value));
              if (view === "before") st().setView("after");
            }}
          />
          {scenario.maxConversionPctWithoutShortfall >= 0 && (
            <div
              aria-hidden
              title={`Up to ${scenario.maxConversionPctWithoutShortfall}%: modelled demand still accommodated`}
              className="pointer-events-none absolute top-[7px] h-[14px] w-[2px] -translate-x-1/2 rounded-full bg-amber"
              style={{ left: `calc(10px + (100% - 20px) * ${scenario.maxConversionPctWithoutShortfall / 100})` }}
            />
          )}
        </div>
        <div className="flex justify-between font-mono text-[10px] text-dim" aria-hidden>
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
        {scenario.maxConversionPctWithoutShortfall >= 0 && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-dim">
            <span aria-hidden className="inline-block h-2.5 w-[2px] rounded-full bg-amber" />
            Parking demand still met up to {scenario.maxConversionPctWithoutShortfall}% (illustrative)
          </p>
        )}
        <p className="mt-3 text-[13px] tabular-nums text-mute">
          <span className="text-ink">{scenario.convertedCount}</span> of {scenario.totalSpaces} spaces become planted
          areas.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-dim">View</div>
          <Segmented
            label="Compare baseline and scenario"
            value={view}
            onChange={(v) => st().setView(v)}
            options={[
              { value: "before", label: "Before (baseline)" },
              { value: "after", label: "After (scenario)" },
            ]}
          />
        </div>
        <div>
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-dim">Tree size shown</div>
          <Segmented
            label="Tree size in 3D view"
            value={canopy}
            onChange={(v) => st().setCanopy(v)}
            options={[
              { value: "sapling", label: "Newly planted" },
              { value: "mature", label: "At maturity" },
            ]}
          />
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={demo.playing ? demo.stop : demo.play}
          className="flex items-center justify-center gap-2 rounded-lg bg-leaf px-4 py-2.5 text-sm font-semibold text-[#06140c] transition hover:brightness-110"
        >
          {demo.playing ? <Square className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
          {demo.playing ? "Stop demo" : "Play 40% demo"}
        </button>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              demo.stop();
              st().reset();
            }}
            className="flex items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink transition hover:bg-raised"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset
          </button>
          <button
            type="button"
            onClick={share}
            className="flex items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink transition hover:bg-raised"
          >
            {copied === "ok" ? <Check className="h-3.5 w-3.5 text-leaf" aria-hidden /> : <Link2 className="h-3.5 w-3.5" aria-hidden />}
            {copied === "ok" ? "Link copied" : "Share"}
          </button>
        </div>
        <p className="sr-only" role="status">
          {copied === "ok" ? "Scenario link copied to clipboard" : ""}
        </p>
      </section>

      <section className="rounded-lg border border-line bg-bg/60 p-4">
        <h2 className="mb-2 text-[13px] font-medium">What this slider changes</h2>
        <p className="text-[13px] leading-relaxed text-mute">
          Converts parking stalls ({ASSUMPTIONS.areaPerSpaceM2} m² each) into planted strips, lot edges first. The 3D
          scene and every number on the right use the same stalls.
        </p>
      </section>
    </aside>
  );
}
