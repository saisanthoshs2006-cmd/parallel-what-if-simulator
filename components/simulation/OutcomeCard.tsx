"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, Check, Link2 } from "lucide-react";
import type { SimulationResult } from "@/lib/simulation/types";
import { useShareScenario } from "@/hooks/useShareScenario";

const areaFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

export function OutcomeCard({ scenario, onExplore }: { scenario: SimulationResult; onExplore: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const { copied, share } = useShareScenario();

  useEffect(() => heading.current?.focus({ preventScroll: true }), []);

  const shortfall = scenario.unaccommodatedDemand;
  const tradeoff = shortfall > 0
    ? `${shortfall} of ${scenario.parkingDemand} assumed cars would no longer fit in the remaining spaces.`
    : `The remaining spaces still accommodate all ${scenario.parkingDemand} cars in this illustrative model.`;

  return (
    <section
      aria-label="Scenario outcome"
      className="outcome-card absolute inset-x-3 bottom-3 z-30 mx-auto max-w-[370px] rounded-2xl border border-leaf/30 bg-[#101820] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.6)] sm:inset-x-auto sm:right-5 sm:bottom-24 sm:mx-0 sm:p-6"
    >
      <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-leaf">Your parallel city</div>
      <h2 ref={heading} tabIndex={-1} className="mt-2 text-xl font-semibold tracking-tight text-ink outline-none sm:text-2xl">
        {scenario.conversionPct}% of parking, reimagined.
      </h2>
      <div className="mt-4 grid grid-cols-3 gap-2 border-y border-line py-4">
        <div>
          <div className="font-mono text-xl font-semibold tabular-nums text-leaf">{areaFormat.format(scenario.greenAreaM2)}</div>
          <div className="mt-1 text-[11px] leading-tight text-mute">m² green added</div>
        </div>
        <div>
          <div className="font-mono text-xl font-semibold tabular-nums text-leaf">{scenario.treeCount}</div>
          <div className="mt-1 text-[11px] leading-tight text-mute">trees planted</div>
        </div>
        <div>
          <div className={`font-mono text-xl font-semibold tabular-nums ${shortfall ? "text-amber" : "text-ink"}`}>
            {shortfall}
          </div>
          <div className="mt-1 text-[11px] leading-tight text-mute">cars without space</div>
        </div>
      </div>
      <p className="mt-4 text-[13px] leading-relaxed text-ink">{tradeoff}</p>
      <p className="mt-1 text-[11px] text-mute">Fictional neighborhood · illustrative assumptions</p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={share}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-leaf px-3 py-2.5 text-sm font-semibold text-[#06140c] transition hover:brightness-110"
        >
          {copied ? <Check className="h-4 w-4" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
          {copied ? "Link copied" : "Share scenario"}
        </button>
        <button
          type="button"
          onClick={onExplore}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-line px-3 py-2.5 text-sm font-medium text-ink transition hover:bg-raised"
        >
          Explore another <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <p className="sr-only" role="status">{copied ? "Scenario link copied to clipboard" : ""}</p>
    </section>
  );
}
