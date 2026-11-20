/**
 * Model assumptions for the Parallel demonstration neighborhood.
 *
 * EVERY number the simulation uses lives here. Nothing is hidden inside the
 * engine or the UI. These are *assumptions* chosen for a fictional
 * neighborhood — they are not real-world measurements.
 */

export interface Assumption {
  key: keyof typeof ASSUMPTIONS;
  label: string;
  value: number;
  unit: string;
  /** Why this value was chosen / what it means. */
  note: string;
}

export const ASSUMPTIONS = {
  /** Footprint of one stall: 2.5 m x 5.0 m. Aisles / drive lanes are NOT converted. */
  areaPerSpaceM2: 12.5,
  /** Share of a converted stall that becomes plantable soil (rest = curbs, edging, paths). */
  plantableFraction: 0.7,
  /** Plantable area needed per newly planted tree (≈ 5.5 m spacing). */
  areaPerTreeM2: 30,
  /** Crown projection area of a single tree at maturity (≈ 5 m crown diameter). */
  matureCanopyPerTreeM2: 20,
  /** Same crown assumption applied to the fictional neighborhood's existing street trees. */
  existingTreeCanopyM2: 20,
  /**
   * ILLUSTRATIVE parking demand: cars that need a space in the baseline.
   * 104 ≈ 72% of the 144 baseline stalls. Assumed, NOT observed.
   */
  illustrativeParkingDemand: 104,
} as const;

export const ASSUMPTION_LIST: Assumption[] = [
  {
    key: "areaPerSpaceM2",
    label: "Area per parking space",
    value: ASSUMPTIONS.areaPerSpaceM2,
    unit: "m²",
    note: "Stall footprint only (2.5 m × 5 m). Drive aisles stay as road surface.",
  },
  {
    key: "plantableFraction",
    label: "Plantable share of converted area",
    value: ASSUMPTIONS.plantableFraction,
    unit: "×",
    note: "The rest is assumed to be curbs, edging and paths.",
  },
  {
    key: "areaPerTreeM2",
    label: "Planting density",
    value: ASSUMPTIONS.areaPerTreeM2,
    unit: "m² / tree",
    note: "One tree per 30 m² of plantable area; trees are floored to whole trees.",
  },
  {
    key: "matureCanopyPerTreeM2",
    label: "Mature canopy per tree",
    value: ASSUMPTIONS.matureCanopyPerTreeM2,
    unit: "m²",
    note: "Crown projection at maturity (typically 15–25+ years). Not a growth forecast.",
  },
  {
    key: "existingTreeCanopyM2",
    label: "Existing street-tree canopy",
    value: ASSUMPTIONS.existingTreeCanopyM2,
    unit: "m² / tree",
    note: "Applied to every street tree in the fictional baseline.",
  },
  {
    key: "illustrativeParkingDemand",
    label: "Illustrative parking demand",
    value: ASSUMPTIONS.illustrativeParkingDemand,
    unit: "cars",
    note: "≈72% of the 144 baseline stalls. Assumed for the demo, not observed or surveyed.",
  },
];

export const LIMITATIONS: string[] = [
  "Fictional demonstration neighborhood — no real city data, survey or GIS source is used.",
  "Outputs are arithmetic consequences of the assumptions above, not predictions or measurements.",
  "No claim is made about temperature, air quality, stormwater, health, traffic or cost.",
  "Tree survival, species, soil and overlapping crowns are ignored; canopy is a gross upper-bound-style sum.",
  "Parking demand is one illustrative number. “Without a space” is a shortfall indicator, not a prediction of displacement, circling, spillover or traffic.",
];

/** The predefined hackathon scenario. */
export const DEMO_SCENARIO = {
  name: "Convert 40% of parking to green space",
  conversionPct: 40,
} as const;

/** Seed for the deterministic layout generator (building heights, pocket parks). */
export const LAYOUT_SEED = 20240611;
