"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { Crosshair, Focus } from "lucide-react";
import { useSim } from "@/store/simulation-store";
import { simulate } from "@/lib/simulation/engine";
import { useUrlSync } from "@/hooks/useUrlSync";
import { useDemo } from "@/hooks/useDemo";
import { ControlsPanel } from "./simulation/ControlsPanel";
import { InsightsPanel } from "./simulation/InsightsPanel";
import { Segmented } from "./ui/Segmented";

const CityCanvas = dynamic(() => import("./city/CityCanvas"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-bg text-sm text-mute">
      <span className="animate-pulse">Loading 3D engine…</span>
    </div>
  ),
});

export function Workspace() {
  useUrlSync();
  const demo = useDemo();
  const pct = useSim((s) => s.conversionPct);
  const view = useSim((s) => s.view);
  const canopy = useSim((s) => s.canopy);
  const camera = useSim((s) => s.camera);
  const frame = useSim((s) => s.frame);
  const setView = useSim((s) => s.setView);

  const baseline = useMemo(() => simulate(0), []);
  const scenario = useMemo(() => simulate(pct), [pct]);
  const active = view === "before" ? baseline : scenario;

  return (
    <main className="grid min-h-screen grid-cols-1 lg:h-screen lg:grid-cols-[320px_minmax(0,1fr)_360px] lg:grid-rows-1 lg:overflow-hidden">
      <ControlsPanel scenario={scenario} demo={demo} />

      <section aria-label="3D neighborhood" className="relative order-first h-[62vh] min-h-[380px] lg:order-none lg:h-auto">
        <CityCanvas sim={active} stage={canopy} camera={camera} />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
          <div className="rounded-md border border-white/10 bg-bg/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-mute">
            Fictional demonstration neighborhood
          </div>
          <div className="pointer-events-auto">
            <Segmented
              label="Compare baseline and scenario"
              value={view}
              onChange={setView}
              options={[
                { value: "before", label: "Before" },
                { value: "after", label: `After · ${pct}%` },
              ]}
              className="bg-bg/85"
            />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
          <p className="rounded-md bg-bg/70 px-2.5 py-1.5 text-[11px] text-dim">Drag to orbit · Scroll to zoom · Right-drag to pan</p>
          <div className="pointer-events-auto flex gap-2">
            <button
              type="button"
              onClick={() => frame("overview")}
              className="flex items-center gap-1.5 rounded-md border border-white/10 bg-bg/85 px-2.5 py-1.5 text-xs text-mute hover:text-ink"
            >
              <Focus className="h-3.5 w-3.5" aria-hidden /> Overview
            </button>
            <button
              type="button"
              onClick={() => frame("focus")}
              className="flex items-center gap-1.5 rounded-md border border-white/10 bg-bg/85 px-2.5 py-1.5 text-xs text-mute hover:text-ink"
            >
              <Crosshair className="h-3.5 w-3.5" aria-hidden /> Lots
            </button>
          </div>
        </div>
      </section>

      <InsightsPanel active={active} baseline={baseline} scenario={scenario} view={view} />
    </main>
  );
}
