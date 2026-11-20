"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, Crosshair, Focus, X } from "lucide-react";
import { SimulationStoreProvider, useSim, useSimStoreApi } from "@/store/simulation-store";
import type { ScenarioState, ViewMode } from "@/lib/simulation/scenario-url";
import { COMPARE_ENABLED } from "@/lib/config/features";
import { simulate } from "@/lib/simulation/engine";
import { prefersReducedMotion } from "@/lib/motion";
import { useUrlSync } from "@/hooks/useUrlSync";
import { useDemo } from "@/hooks/useDemo";
import { ControlsPanel } from "./simulation/ControlsPanel";
import { InsightsPanel } from "./simulation/InsightsPanel";
import { OutcomeCard } from "./simulation/OutcomeCard";
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

function Opening({ onStart }: { onStart: () => void }) {
  return (
    <div className="opening-overlay absolute inset-0 z-30 flex flex-col justify-between p-5 text-ink sm:p-8 lg:p-12">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5 text-sm font-semibold tracking-tight">
          <span aria-hidden className="inline-block h-3 w-3 rotate-45 rounded-[2px] bg-leaf" />
          PARALLEL
        </div>
        <span className="rounded-full border border-white/20 bg-bg/50 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-mute backdrop-blur">
          A fictional city model
        </span>
      </div>
      <div className="max-w-[680px] pb-7 sm:pb-10 lg:pb-14">
        <p className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-leaf">
          Rewrite your city
        </p>
        <h1 className="max-w-[670px] font-serif text-[clamp(2.6rem,6.2vw,5.8rem)] leading-[0.98] tracking-[-0.055em] text-white">
          What if <span className="text-leaf">40%</span> of your city&apos;s parking became green space?
        </h1>
        <p className="mt-5 max-w-[470px] text-sm leading-relaxed text-[#c5ced5] sm:text-base">
          Watch a neighborhood change, then decide whether the green space is worth the parking trade-off.
        </p>
        <button
          type="button"
          onClick={onStart}
          className="mt-7 inline-flex items-center justify-center gap-3 rounded-lg bg-leaf px-5 py-3 text-sm font-semibold text-[#06140c] shadow-[0_12px_40px_rgba(95,211,141,0.2)] transition hover:brightness-110"
        >
          See the transformation <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
        <p className="mt-4 text-[11px] text-[#a5b0bb]">Illustrative scenario · no real city data</p>
      </div>
    </div>
  );
}

function WorkspaceInner({ showIntro }: { showIntro: boolean }) {
  useUrlSync();
  const demo = useDemo();
  const [introOpen, setIntroOpen] = useState(showIntro);
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
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

  useEffect(() => {
    if (demo.revealComplete) {
      setOutcomeOpen(true);
      setInsightsOpen(false);
    }
  }, [demo.revealComplete]);

  function changeView(next: ViewMode) {
    demo.stop();
    setOutcomeOpen(false);
    setView(next);
  }

  function startReveal() {
    setIntroOpen(false);
    setOutcomeOpen(false);
    setInsightsOpen(false);
    demo.playReveal();
  }

  function explore() {
    setOutcomeOpen(false);
    window.setTimeout(() => {
      const slider = document.getElementById("conversion");
      slider?.scrollIntoView({ block: "end", behavior: prefersReducedMotion() ? "auto" : "smooth" });
      slider?.focus({ preventScroll: true });
    }, 0);
  }

  function showCityForPlayback() {
    if (window.innerWidth < 1024) {
      document.querySelector(".city-stage")?.scrollIntoView({
        block: "start",
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
    }
  }

  const controlsDemo = {
    ...demo,
    play: () => {
      setOutcomeOpen(false);
      showCityForPlayback();
      demo.play();
    },
    playReveal: () => {
      setOutcomeOpen(false);
      showCityForPlayback();
      demo.playReveal();
    },
  };

  return (
    <main className={`workspace-shell flex min-h-screen flex-col ${introOpen ? "workspace-intro" : "workspace-active"}`}>
      <div className={`controls-rail min-h-0 ${introOpen ? "hidden lg:block" : ""}`} inert={introOpen} aria-hidden={introOpen}>
        <ControlsPanel scenario={scenario} demo={controlsDemo} />
      </div>

      <section
        aria-label="3D neighborhood"
        className={`city-stage relative order-first shrink-0 overflow-hidden lg:order-none lg:h-full lg:min-h-0 ${introOpen ? "h-svh min-h-[520px] city-stage-intro" : "h-[65svh] min-h-[420px]"}`}
      >
        <CityCanvas
          sim={active}
          baselineSim={baseline}
          compare={COMPARE_ENABLED && view === "compare"}
          store={store}
          stage={canopy}
          camera={camera}
        />

        {introOpen ? (
          <Opening onStart={startReveal} />
        ) : (
          <>
            {COMPARE_ENABLED && view === "compare" && (
              <CompareDivider split={split} scenarioPct={pct} onChange={setSplit} onInteract={demo.stop} />
            )}

            <div className={`pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between sm:p-4 ${outcomeOpen ? "hidden sm:flex" : ""}`}>
              <div className="flex items-start justify-between gap-2 sm:flex-col">
                <span className="rounded-md border border-white/10 bg-bg/85 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-mute backdrop-blur">
                  Fictional neighborhood
                </span>
                <button
                  type="button"
                  onClick={() => document.getElementById("mobile-insights")?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" })}
                  className="pointer-events-auto inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-bg/85 px-2.5 py-1.5 text-xs text-ink backdrop-blur hover:bg-raised sm:hidden"
                >
                  <BarChart3 className="h-3.5 w-3.5" aria-hidden /> Insights
                </button>
                {active.unaccommodatedDemand > 0 && (
                  <span role="status" className="hidden rounded-md border border-amber/40 bg-bg/85 px-2.5 py-1.5 text-[11px] text-amber sm:block">
                    {active.unaccommodatedDemand} assumed cars without a space
                  </span>
                )}
              </div>
              <div className="pointer-events-auto flex items-center justify-end gap-2">
                <Segmented
                  label="Compare baseline and scenario"
                  value={view}
                  onChange={changeView}
                  options={[
                    { value: "before", label: "Before" },
                    { value: "after", label: "After" },
                    ...(COMPARE_ENABLED ? [{ value: "compare" as const, label: "Compare" }] : []),
                  ]}
                  className="bg-bg/85 backdrop-blur"
                  nowrap
                />
                <button
                  type="button"
                  onClick={() => setInsightsOpen((open) => !open)}
                  aria-expanded={insightsOpen}
                  aria-controls="desktop-insights"
                  className="hidden items-center gap-1.5 rounded-lg border border-line bg-bg/85 px-3 py-2 text-xs text-ink backdrop-blur hover:bg-raised lg:inline-flex"
                >
                  <BarChart3 className="h-3.5 w-3.5" aria-hidden /> Insights
                </button>
              </div>
            </div>

            <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 bg-gradient-to-t from-bg/90 to-transparent p-3 pt-10 sm:p-4 sm:pt-12 ${outcomeOpen ? "hidden sm:flex" : ""}`}>
              <div className={`pointer-events-auto items-center justify-end gap-2 ${outcomeOpen ? "hidden" : "flex"}`}>
                <span className="mr-auto hidden text-[11px] text-mute md:block">Drag to orbit · Scroll to zoom</span>
                <button type="button" onClick={() => { demo.stop(); frame("overview"); }} className="city-tool">
                  <Focus className="h-3.5 w-3.5" aria-hidden /> Overview
                </button>
                <button type="button" onClick={() => { demo.stop(); frame("focus"); }} className="city-tool">
                  <Crosshair className="h-3.5 w-3.5" aria-hidden /> Top view
                </button>
              </div>
              <div className="pointer-events-auto grid grid-cols-3 divide-x divide-white/10 rounded-xl border border-white/10 bg-bg/85 py-2 shadow-lg backdrop-blur sm:max-w-[540px]">
                <div className="px-3">
                  <div className="font-mono text-sm font-semibold tabular-nums text-leaf">{scenario.greenAreaM2.toLocaleString("en-US", { maximumFractionDigits: 1 })} m²</div>
                  <div className="text-[10px] text-mute">green added</div>
                </div>
                <div className="px-3">
                  <div className="font-mono text-sm font-semibold tabular-nums text-leaf">{scenario.treeCount}</div>
                  <div className="text-[10px] text-mute">trees planted</div>
                </div>
                <div className="px-3">
                  <div className={`font-mono text-sm font-semibold tabular-nums ${scenario.unaccommodatedDemand ? "text-amber" : "text-ink"}`}>
                    {scenario.unaccommodatedDemand}
                  </div>
                  <div className="text-[10px] text-mute">cars without space</div>
                </div>
              </div>
            </div>

            {insightsOpen && (
              <div id="desktop-insights" className="insights-drawer absolute bottom-24 right-4 top-20 z-20 hidden w-[min(350px,calc(100%-32px))] overflow-hidden rounded-xl border border-line bg-panel shadow-2xl lg:block">
                <button
                  type="button"
                  onClick={() => setInsightsOpen(false)}
                  aria-label="Close insights"
                  className="absolute right-3 top-3 z-10 rounded-md p-1 text-mute hover:bg-raised hover:text-ink"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
                <InsightsPanel active={active} baseline={baseline} scenario={scenario} view={view} />
              </div>
            )}

            {outcomeOpen && <OutcomeCard scenario={scenario} onExplore={explore} />}
          </>
        )}
      </section>

      {!introOpen && (
        <div id="mobile-insights" className="lg:hidden">
          <InsightsPanel active={active} baseline={baseline} scenario={scenario} view={view} />
        </div>
      )}
    </main>
  );
}

/** Shared links open the selected scenario directly; new visitors see the guided opening. */
export function Workspace({ initial, showIntro }: { initial: ScenarioState; showIntro: boolean }) {
  return (
    <SimulationStoreProvider initial={initial}>
      <WorkspaceInner showIntro={showIntro} />
    </SimulationStoreProvider>
  );
}
