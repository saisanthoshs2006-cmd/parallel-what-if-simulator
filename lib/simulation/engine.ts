import { ASSUMPTIONS } from "@/lib/config/assumptions";
import { CITY } from "./layout";
import type { CityLayout, PlantedTree, SimulationResult } from "./types";

export type Assumptions = { -readonly [K in keyof typeof ASSUMPTIONS]: number };

/** Slider domain. */
export const MIN_PCT = 0;
export const MAX_PCT = 100;

/** Clamp to [0,100] and round to a whole percent. Non-finite input → 0. */
export function clampPct(value: number): number {
  if (!Number.isFinite(value)) return MIN_PCT;
  return Math.min(MAX_PCT, Math.max(MIN_PCT, Math.round(value)));
}

/** Number of stalls converted at a given percentage (nearest whole stall). */
export function convertedCountFor(pct: number, totalSpaces: number): number {
  return Math.round((clampPct(pct) / 100) * totalSpaces);
}

/**
 * Parking-pressure threshold: the highest whole-percent conversion at which
 * retained spaces still cover the assumed demand. Pure function of the inputs.
 */
export function parkingThreshold(
  totalSpaces: number,
  assumptions: Assumptions = ASSUMPTIONS,
) {
  const demand = Math.min(assumptions.illustrativeParkingDemand, totalSpaces);
  let maxPct = -1;
  for (let p = MIN_PCT; p <= MAX_PCT; p++) {
    if (totalSpaces - convertedCountFor(p, totalSpaces) >= demand) maxPct = p;
    else break; // converted count is monotonic in p
  }
  return {
    demand,
    maxConvertedWithoutShortfall: Math.max(0, totalSpaces - demand),
    maxConversionPctWithoutShortfall: maxPct,
    firstShortfallPct: maxPct < MAX_PCT ? maxPct + 1 : null,
  };
}

/**
 * Pure simulation. Same inputs → identical output.
 *
 * 1. converted stalls = first N IDs of the layout's fixed conversion order
 * 2. converted area   = N × area per stall
 * 3. green area       = converted area × plantable fraction
 * 4. trees            = floor(green area / area-per-tree)
 * 5. canopy           = trees × mature canopy per tree   (model output at maturity)
 *
 * Tree k is hosted by a fixed stall in the conversion order (determined only
 * by k), so trees never "jump" when the slider moves — they only appear.
 *
 * Parking pressure (ILLUSTRATIVE — demand is an assumption, not an observation):
 *   demand        = assumptions.illustrativeParkingDemand (capped at total stalls)
 *   unaccommodated = max(0, demand - retained)
 * Baseline cars sit in the first `demand` stalls of layout.carOrder. A car whose
 * stall is converted moves to an empty retained stall if one exists (taken from
 * the stalls that convert last); otherwise it is counted as unaccommodated and
 * its origin stall is reported in `unaccommodatedIds`. This is bookkeeping for
 * the visual, not a behavioural model: nothing says where such cars would go.
 */
export function simulate(
  pct: number,
  layout: CityLayout = CITY,
  assumptions: Assumptions = ASSUMPTIONS,
): SimulationResult {
  const conversionPct = clampPct(pct);
  const order = layout.conversionOrder;
  const totalSpaces = order.length;
  const convertedCount = convertedCountFor(conversionPct, totalSpaces);

  const convertedIds = order.slice(0, convertedCount);
  const retainedIds = order.slice(convertedCount);

  const convertedAreaM2 = convertedCount * assumptions.areaPerSpaceM2;
  const greenAreaM2 = convertedAreaM2 * assumptions.plantableFraction;
  const hardscapeM2 = convertedAreaM2 - greenAreaM2;

  const treeCount = Math.floor(greenAreaM2 / assumptions.areaPerTreeM2 + 1e-9);
  const plantablePerSpace = assumptions.areaPerSpaceM2 * assumptions.plantableFraction;
  const byId = new Map(layout.spaces.map((s) => [s.id, s]));

  const trees: PlantedTree[] = [];
  for (let k = 0; k < treeCount; k++) {
    const hostIdx = Math.min(
      convertedCount - 1,
      Math.ceil(((k + 1) * assumptions.areaPerTreeM2) / plantablePerSpace - 1e-9) - 1,
    );
    const hostId = order[hostIdx];
    const host = byId.get(hostId)!;
    trees.push({ id: `tree-${k}`, hostSpaceId: hostId, x: host.x, z: host.z });
  }

  const existingTreeCount = layout.streetTrees.length;
  const existingCanopyM2 = existingTreeCount * assumptions.existingTreeCanopyM2;
  const addedCanopyM2 = treeCount * assumptions.matureCanopyPerTreeM2;
  const totalCanopyM2 = existingCanopyM2 + addedCanopyM2;

  // --- Parking pressure ---
  const th = parkingThreshold(totalSpaces, assumptions);
  const demand = th.demand;
  const convertedSet = new Set(convertedIds);
  const baselineCars = layout.carOrder.slice(0, demand);
  const baselineSet = new Set(baselineCars);
  const staying = baselineCars.filter((id) => !convertedSet.has(id));
  const displacedInOrder = convertedIds.filter((id) => baselineSet.has(id));
  const stayingSet = new Set(staying);
  const emptyRetained = [...retainedIds].reverse().filter((id) => !stayingSet.has(id));
  const relocated = emptyRetained.slice(0, displacedInOrder.length);
  const unaccommodatedDemand = Math.max(0, demand - retainedIds.length);
  const unaccommodatedIds = displacedInOrder.slice(0, unaccommodatedDemand);

  return {
    conversionPct,
    totalSpaces,
    convertedCount,
    retainedCount: totalSpaces - convertedCount,
    convertedIds,
    retainedIds,
    convertedAreaM2,
    greenAreaM2,
    hardscapeM2,
    treeCount,
    trees,
    existingTreeCount,
    existingCanopyM2,
    addedCanopyM2,
    totalCanopyM2,
    canopyCoverPct: (totalCanopyM2 / layout.studyAreaM2) * 100,
    parkingDemand: demand,
    accommodatedDemand: demand - unaccommodatedDemand,
    unaccommodatedDemand,
    parkingStatus: unaccommodatedDemand > 0 ? "shortfall" : "accommodated",
    parkedIds: [...staying, ...relocated],
    unaccommodatedIds,
    maxConvertedWithoutShortfall: th.maxConvertedWithoutShortfall,
    maxConversionPctWithoutShortfall: th.maxConversionPctWithoutShortfall,
    firstShortfallPct: th.firstShortfallPct,
  };
}

/** Sweep 0..100 for charting the engine's response curve. */
export function sweep(step = 5, layout: CityLayout = CITY) {
  const rows: Array<{ pct: number; retained: number; green: number; addedCanopy: number }> = [];
  for (let p = MIN_PCT; p <= MAX_PCT; p += step) {
    const r = simulate(p, layout);
    rows.push({ pct: p, retained: r.retainedCount, green: r.greenAreaM2, addedCanopy: r.addedCanopyM2 });
  }
  return rows;
}
