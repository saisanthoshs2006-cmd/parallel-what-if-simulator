"use client";

import { useEffect, useRef, useState } from "react";
import type { SimulationResult } from "@/lib/simulation/types";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

function Stat({ label, value, tone }: { label: string; value: number; tone?: "amber" | "leaf" }) {
  const color = tone === "amber" ? "text-amber" : tone === "leaf" ? "text-leaf" : "text-ink";
  return (
    <div>
      <div className="text-[10px] leading-tight text-mute">{label}</div>
      <AnimatedNumber value={value} className={`font-mono text-lg font-semibold tabular-nums ${color}`} />
    </div>
  );
}

/**
 * Capacity vs assumed demand on one bar (scale = all baseline spaces):
 *   solid amber   = retained spaces
 *   green         = converted spaces
 *   hatched amber = assumed demand that exceeds retained capacity
 *   white tick    = assumed demand (104 cars)
 */
function PressureBar({ r }: { r: SimulationResult }) {
  const pct = (n: number) => `${(n / r.totalSpaces) * 100}%`;
  const short = Math.max(0, r.parkingDemand - r.retainedCount);
  return (
    <div
      role="img"
      aria-label={`${r.retainedCount} spaces retained, ${r.convertedCount} converted. Assumed demand ${r.parkingDemand} cars. ${
        short > 0 ? `${short} modelled cars without a space.` : "All modelled demand accommodated."
      }`}
      className="relative mt-4 mb-6"
    >
      <div className="relative h-3 overflow-hidden rounded-full bg-[#222b34]">
        <div className="absolute inset-y-0 left-0 bg-amber transition-[width] duration-500" style={{ width: pct(r.retainedCount) }} />
        <div
          className="absolute inset-y-0 right-0 bg-leaf/80 transition-[width] duration-500"
          style={{ width: pct(r.convertedCount) }}
        />
        <div
          className="absolute inset-y-0 border-y border-amber/80 transition-[left,width] duration-500"
          style={{
            left: pct(r.retainedCount),
            width: pct(short),
            backgroundImage:
              "repeating-linear-gradient(135deg, rgba(217,164,65,0.95) 0 3px, rgba(14,19,24,0.55) 3px 6px)",
          }}
        />
      </div>
      <div
        className="absolute -top-1 bottom-0 w-px bg-white/90"
        style={{ left: pct(r.parkingDemand), height: "20px" }}
        aria-hidden
      />
      <div
        className="absolute top-[22px] -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-ink"
        style={{ left: pct(r.parkingDemand) }}
        aria-hidden
      >
        demand {r.parkingDemand}
      </div>
    </div>
  );
}

const FLASH_MS = 1600;

/**
 * Primary parking insight. When the modelled status flips (either direction) a ring around the
 * card pulses briefly and the message swaps to explain the trade-off. Only the ring and the
 * message are (re)mounted — the card and its counters stay mounted, so numbers keep animating
 * across the threshold. The message sits in a persistent live region so the change is announced.
 */
export function ParkingPressure({ sim }: { sim: SimulationResult }) {
  const shortfall = sim.parkingStatus === "shortfall";
  const spare = sim.retainedCount - sim.parkingDemand;
  const [flash, setFlash] = useState({ count: 0, on: false });
  const prev = useRef(shortfall);

  useEffect(() => {
    if (prev.current === shortfall) return;
    prev.current = shortfall;
    setFlash((f) => ({ count: f.count + 1, on: true }));
    const t = setTimeout(() => setFlash((f) => ({ ...f, on: false })), FLASH_MS);
    return () => clearTimeout(t);
  }, [shortfall]);

  const limit = sim.maxConversionPctWithoutShortfall;
  const message = shortfall
    ? `Past ${limit}% every extra space converted leaves one more assumed car without a space.`
    : `Up to ${limit}% can be converted and the assumed demand still fits. Beyond that, parking runs short.`;

  return (
    <div
      className={`relative rounded-lg border p-4 transition-colors duration-500 ${
        shortfall ? "border-amber/40 bg-amber/[0.06]" : "border-line bg-bg/50"
      }`}
    >
      {flash.on && <span key={flash.count} aria-hidden className="pressure-flash-ring" />}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`text-sm font-semibold transition-colors duration-500 ${shortfall ? "text-amber" : "text-leaf"}`}>
            {shortfall ? "Demand exceeds capacity" : "Demand accommodated"}
          </div>
          <p className="mt-0.5 text-[12px] leading-snug text-mute">
            {shortfall ? (
              <>
                <span className="tabular-nums text-ink">{sim.unaccommodatedDemand}</span> of {sim.parkingDemand} assumed
                cars have no space.
              </>
            ) : (
              <>
                {sim.retainedCount} spaces for {sim.parkingDemand} assumed cars
                {spare > 0 && (
                  <>
                    {" "}
                    — <span className="tabular-nums text-ink">{spare}</span> to spare
                  </>
                )}
                .
              </>
            )}
          </p>
        </div>
        <span className="mt-0.5 shrink-0 rounded-full border border-white/15 px-1.5 py-px font-mono text-[9px] uppercase tracking-wider text-mute">
          Illustrative
        </span>
      </div>

      <PressureBar r={sim} />

      <div className="grid grid-cols-4 items-end gap-2">
        <Stat label="Retained" value={sim.retainedCount} />
        <Stat label="Converted" value={sim.convertedCount} tone="leaf" />
        <Stat label="Assumed demand" value={sim.parkingDemand} />
        <Stat label="Without space" value={sim.unaccommodatedDemand} tone={shortfall ? "amber" : undefined} />
      </div>

      <div role="status" aria-live="polite" className="mt-3 border-t border-line pt-3">
        <p key={shortfall ? "short" : "ok"} className="pressure-message text-[12px] leading-snug text-ink">
          {message}
        </p>
      </div>
      <p className="mt-2 text-[10px] leading-snug text-dim">
        Demand is an assumption, not an observation; the model does not predict where unhoused cars would go.
      </p>
    </div>
  );
}
