import type { CityLayout, SimulationResult } from "@/lib/simulation/types";

/**
 * Per-instance target state for every parking space, aligned to `layout.spaces` order.
 * Instance index i ALWAYS corresponds to `layout.spaces[i].id`, so the 3D instances and the
 * simulation outputs (convertedIds / parkedIds / unaccommodatedIds) are tied together by ID.
 * Pure (no three.js) so it can be unit-tested.
 */
export interface StallTargets {
  /** 1 = stall converted to a planted strip. */
  converted: Float32Array;
  /** 1 = a modelled car occupies the stall. */
  parked: Float32Array;
  /** 1 = a modelled car without a space is marked on the stall. */
  ghost: Float32Array;
}

export function buildStallTargets(layout: CityLayout, sim: SimulationResult): StallTargets {
  const n = layout.spaces.length;
  const conv = new Set(sim.convertedIds);
  const parked = new Set(sim.parkedIds);
  const ghost = new Set(sim.unaccommodatedIds);
  const t: StallTargets = {
    converted: new Float32Array(n),
    parked: new Float32Array(n),
    ghost: new Float32Array(n),
  };
  layout.spaces.forEach((s, i) => {
    t.converted[i] = conv.has(s.id) ? 1 : 0;
    t.parked[i] = parked.has(s.id) ? 1 : 0;
    t.ghost[i] = ghost.has(s.id) ? 1 : 0;
  });
  return t;
}

/** Tree instance targets: 1 where simulated tree k exists. Indexed like `potential`. */
export function buildTreeTargets(potentialIds: string[], activeIds: ReadonlySet<string>): Float32Array {
  const out = new Float32Array(potentialIds.length);
  potentialIds.forEach((id, i) => (out[i] = activeIds.has(id) ? 1 : 0));
  return out;
}
