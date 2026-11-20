"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { Crosshair, Focus } from "lucide-react";
import { SimulationStoreProvider, useSim, useSimStoreApi } from "@/store/simulation-store";
import type { ScenarioState } from "@/lib/simulation/scenario-url";
import { COMPARE_ENABLED } from "@/lib/config/features";
import { simulate } from "@/lib/simulation/engine";
import { useUrlSync } from "@/hooks/useUrlSync";
import { useDemo } from "@/hooks/useDemo";
import { ControlsPanel } from "./simulation/ControlsPanel";
import { InsightsPanel } from "./simulation/InsightsPanel";
import { Segmented } from "./ui/Segmented";
import { CompareDivider } from "./city/CompareDivider";

const CityCanvas = dynamic(() => import("./city/CityCanvas"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-bg text-sm text-mute">
      <span className="animate-pulse">Loading 3D engine…</span>
    </div>
  ),
});

function WorkspaceInner() {
  useUrlSync();
  const demo = useDemo();
  const store = useSimStoreApi();
  const pct = useSim((s) => s.conversionPct);
  const view = useSim((s) => s.view);
  const canopy = useSim((s) => s.canopy);
  const camera = useSim((s) => s.camera);
  const frame = useSim((s) => s.frame);
  const setView = useSim((s) => s.setView);
  const split = useSim((s) => s.split);
  const setSplit = useSim((s) => s.setSplit);

  const baseline = useMemo(() => simulate(0), []);
  const scenario = useMemo(() => simulate(pct), [pct]);
  const active = view === "before" ? baseline : scenario;

  return (
    <main className="flex min-h-screen flex-col lg:grid lg:h-screen lg:grid-cols-[320px_minmax(0,1fr)_360px] lg:grid-rows-1 lg:overflow-hidden">
      <ControlsPanel scenario={scenario} demo={demo} />

      <section aria-label="3D neighborhood" className="sticky top-0 z-20 order-first h-[46vh] min-h-[300px] shrink-0 lg:relative lg:order-none lg:h-auto lg:min-h-0">
        <CityCanvas
          sim={active}
          baselineSim={baseline}
          compare={COMPARE_ENABLED && view === "compare"}
          store={store}
          stage={canopy}
          camera={camera}
        />

        {COMPARE_ENABLED && view === "compare" && (
          <CompareDivider split={split} scenarioPct={pct} onChange={setSplit} onInteract={demo.stop} />
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
          <div className="flex flex-col items-start gap-2">
            <div className="rounded-md border border-white/10 bg-bg/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-mute">
              <span className="sm:hidden">Fictional neighborhood</span>
              <span className="hidden sm:inline">Fictional demonstration neighborhood</span>
            </div>
            {active.unaccommodatedDemand > 0 && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-md border border-amber/40 bg-bg/85 px-2.5 py-1.5 text-[11px] text-ink"
              >
                <span aria-hidden className="inline-block h-2.5 w-4 rounded-sm bg-amber/60" />
                <span>
                  {view === "compare" && <span className="text-mute">Scenario: </span>}
                  <span className="font-mono tabular-nums text-amber">{active.unaccommodatedDemand}</span> assumed cars
                  without a space<span className="hidden sm:inline"> (amber, illustrative)</span>
                </span>
              </div>
            )}
          </div>
          <div className="pointer-events-auto">
            <Segmented
              label="Compare baseline and scenario"
              value={view}
              onChange={setView}
              options={[
                { value: "before", label: "Before" },
                {
                  value: "after",
                  label: (
                    <>
                      After<span className="hidden sm:inline"> · {pct}%</span>
                    </>
                  ),
                },
                ...(COMPARE_ENABLED ? [{ value: "compare" as const, label: "Compare" }] : []),
              ]}
              className="bg-bg/85"
              nowrap
            />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
          <p className="hidden rounded-md bg-bg/70 px-2.5 py-1.5 text-[11px] text-dim sm:block">Drag to orbit · Scroll to zoom · Right-drag to pan</p>
          <div className="pointer-events-auto ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => frame("overview")}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-md border border-white/10 bg-bg/85 px-2.5 py-1.5 text-xs text-mute hover:text-ink"
            >
              <Focus className="h-3.5 w-3.5" aria-hidden /> Overview
            </button>
            <button
              type="button"
              onClick={() => frame("focus")}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-md border border-white/10 bg-bg/85 px-2.5 py-1.5 text-xs text-mute hover:text-ink"
            >
              <Crosshair className="h-3.5 w-3.5" aria-hidden /> Top view
            </button>
          </div>
        </div>
      </section>

      <InsightsPanel active={active} baseline={baseline} scenario={scenario} view={view} />
    </main>
  );
}

/** `initial` is parsed from the URL on the server, so the first paint already shows the shared scenario. */
export function Workspace({ initial }: { initial: ScenarioState }) {
  return (
    <SimulationStoreProvider initial={initial}>
      <WorkspaceInner />
    </SimulationStoreProvider>
  );
}
