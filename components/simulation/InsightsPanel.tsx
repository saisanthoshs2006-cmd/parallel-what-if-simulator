"use client";

import type { ReactNode } from "react";
import type { SimulationResult } from "@/lib/simulation/types";
import { ASSUMPTION_LIST, LIMITATIONS } from "@/lib/config/assumptions";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Tag } from "@/components/ui/Tag";
import { CanopyCurveChart, ParkingCompositionChart } from "./Charts";

function Metric({
  label,
  value,
  unit,
  decimals = 0,
  delta,
  hint,
}: {
  label: string;
  value: number;
  unit?: string;
  decimals?: number;
  delta?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-bg/50 p-3.5">
      <div className="text-[11px] text-mute">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <AnimatedNumber value={value} decimals={decimals} className="font-mono text-2xl font-semibold tabular-nums" />
        {unit && <span className="text-xs text-mute">{unit}</span>}
      </div>
      {delta && <div className="mt-0.5 font-mono text-[10px] text-leaf">{delta}</div>}
      {hint && <div className="mt-1 text-[10px] leading-snug text-dim">{hint}</div>}
    </div>
  );
}

function Section({ title, tag, children }: { title: string; tag?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="font-mono text-[10px] uppercase tracking-wider text-dim">{title}</h2>
        {tag}
      </div>
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
  const pctRetained = (active.retainedCount / active.totalSpaces) * 100;
  const dCanopy = active.totalCanopyM2 - baseline.totalCanopyM2;
  return (
    <aside
      aria-label="Simulation insights"
      className="scroll-thin flex flex-col gap-7 overflow-y-auto border-t border-line bg-panel p-6 lg:border-t-0 lg:border-l"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Simulation insights</h2>
          <p className="mt-1 text-[13px] text-mute">
            Showing {view === "before" ? "the baseline" : `the ${scenario.conversionPct}% scenario`}
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

      <Section title="Parking" tag={<Tag kind="model" />}>
        <div className="rounded-lg border border-line bg-bg/50 p-4">
          <div className="flex items-baseline gap-2">
            <AnimatedNumber value={active.retainedCount} className="font-mono text-4xl font-semibold tabular-nums text-amber" />
            <span className="text-sm text-mute">of {active.totalSpaces} spaces retained</span>
          </div>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-[#222b34]" aria-hidden>
            <div className="bg-amber transition-[width] duration-500" style={{ width: `${pctRetained}%` }} />
            <div className="bg-leaf transition-[width] duration-500" style={{ width: `${100 - pctRetained}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-mute">
            <span>
              <span className="text-amber">●</span> Retained
            </span>
            <span>
              <span className="text-leaf">●</span> Converted: <span className="tabular-nums text-ink">{active.convertedCount}</span>
            </span>
          </div>
        </div>
      </Section>

      <Section title="Green space" tag={<Tag kind="model" />}>
        <div className="grid grid-cols-2 gap-2.5">
          <Metric
            label="Added green area"
            value={active.greenAreaM2}
            unit="m²"
            decimals={1}
            hint={`of ${active.convertedAreaM2.toLocaleString("en-US")} m² converted`}
          />
          <Metric label="Trees planted" value={active.treeCount} hint="floored to whole trees" />
          <Metric
            label="Added canopy at maturity"
            value={active.addedCanopyM2}
            unit="m²"
            hint="projected crown area, not today"
          />
          <Metric
            label="Total canopy at maturity"
            value={active.totalCanopyM2}
            unit="m²"
            delta={dCanopy > 0 ? `+${dCanopy.toLocaleString("en-US")} m² vs baseline` : undefined}
            hint={`${active.canopyCoverPct.toFixed(1)}% of study area`}
          />
        </div>
      </Section>

      <Section title="Baseline vs scenario" tag={<Tag kind="model" />}>
        <ParkingCompositionChart baseline={baseline} scenario={scenario} />
      </Section>

      <Section title="Response curve: added canopy" tag={<Tag kind="model" />}>
        <CanopyCurveChart current={scenario} />
        <p className="mt-1 text-[11px] text-dim">Step-shaped because trees are whole units.</p>
      </Section>

      <Section title="Assumptions" tag={<Tag kind="assumption" />}>
        <dl className="divide-y divide-line rounded-lg border border-line">
          {ASSUMPTION_LIST.map((a) => (
            <div key={a.key} className="px-3.5 py-2.5">
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
      </Section>

      <Section title="Limitations" tag={<Tag kind="measured" />}>
        <ul className="list-disc space-y-1.5 pl-4 text-[12px] leading-snug text-mute marker:text-dim">
          {LIMITATIONS.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <p className="mt-3 rounded-lg border border-line bg-bg/50 p-3 text-[11px] leading-snug text-dim">
          <span className="text-mute">Reading this panel:</span> <Tag kind="model" /> values are calculated by the
          engine; <Tag kind="assumption" /> values are inputs we chose; <Tag kind="measured" /> would be field
          data — none is used here.
        </p>
      </Section>
    </aside>
  );
}
