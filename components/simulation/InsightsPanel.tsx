"use client";

import type { ReactNode } from "react";
import type { SimulationResult } from "@/lib/simulation/types";
import { ASSUMPTION_LIST, LIMITATIONS } from "@/lib/config/assumptions";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Tag } from "@/components/ui/Tag";
import { ParkingPressure } from "./ParkingPressure";

function Metric({
  label,
  value,
  unit,
  decimals = 0,
  hint,
}: {
  label: string;
  value: number;
  unit?: string;
  decimals?: number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-bg/50 p-3.5">
      <div className="text-[11px] text-mute">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <AnimatedNumber value={value} decimals={decimals} className="font-mono text-2xl font-semibold tabular-nums" />
        {unit && <span className="text-xs text-mute">{unit}</span>}
      </div>
      {hint && <div className="mt-0.5 text-[10px] leading-snug text-dim">{hint}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2.5 font-mono text-[10px] uppercase tracking-wider text-dim">{title}</h2>
      {children}
    </section>
  );
}

export function InsightsPanel({
  active,
  baseline,
  scenario,
  view,
}: {
  /** State currently shown in 3D (baseline or scenario). */
  active: SimulationResult;
  baseline: SimulationResult;
  scenario: SimulationResult;
  view: "before" | "after";
}) {
  const dCanopy = active.totalCanopyM2 - baseline.totalCanopyM2;
  return (
    <aside
      aria-label="Simulation insights"
      className="scroll-thin flex flex-col gap-6 overflow-y-auto border-t border-line bg-panel p-6 lg:border-t-0 lg:border-l"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Simulation insights</h2>
          <p className="mt-1 text-[12px] text-mute">
            {view === "before" ? "Baseline" : `${scenario.conversionPct}% scenario`} · fictional neighborhood
          </p>
        </div>
        <span
          className={`mt-0.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
            view === "before" ? "border-amber/40 text-amber" : "border-leaf/40 text-leaf"
          }`}
        >
          {view === "before" ? "Baseline" : "Scenario"}
        </span>
      </header>

      <Section title="Parking pressure">
        <ParkingPressure sim={active} />
      </Section>

      <Section title="Green space">
        <div className="grid grid-cols-2 gap-2.5">
          <Metric
            label="Added green area"
            value={active.greenAreaM2}
            unit="m²"
            decimals={1}
            hint={`from ${active.convertedAreaM2.toLocaleString("en-US")} m² converted`}
          />
          <Metric label="Trees planted" value={active.treeCount} hint="whole trees" />
          <Metric label="Added canopy" value={active.addedCanopyM2} unit="m²" hint="at maturity" />
          <Metric
            label="Total canopy"
            value={active.totalCanopyM2}
            unit="m²"
            hint={dCanopy > 0 ? `+${dCanopy.toLocaleString("en-US")} vs baseline, at maturity` : "baseline, at maturity"}
          />
        </div>
      </Section>

      <details className="group rounded-lg border border-line">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 py-3 text-[13px] font-medium text-ink hover:bg-raised [&::-webkit-details-marker]:hidden">
          <span>Assumptions &amp; limitations</span>
          <span aria-hidden className="font-mono text-mute transition-transform group-open:rotate-45">
            +
          </span>
        </summary>
        <div className="flex flex-col gap-4 border-t border-line p-4">
          <dl className="divide-y divide-line">
            {ASSUMPTION_LIST.map((a) => (
              <div key={a.key} className="py-2 first:pt-0">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-[12px] text-ink">{a.label}</dt>
                  <dd className="font-mono text-[12px] tabular-nums text-amber">
                    {a.value} <span className="text-dim">{a.unit}</span>
                  </dd>
                </div>
                <p className="mt-0.5 text-[11px] leading-snug text-dim">{a.note}</p>
              </div>
            ))}
          </dl>
          <ul className="list-disc space-y-1.5 pl-4 text-[11px] leading-snug text-mute marker:text-dim">
            {LIMITATIONS.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <p className="text-[11px] leading-snug text-dim">
            <Tag kind="model" /> values are calculated from the <Tag kind="assumption" /> values above. No{" "}
            <Tag kind="measured" /> is used.
          </p>
        </div>
      </details>
    </aside>
  );
}
