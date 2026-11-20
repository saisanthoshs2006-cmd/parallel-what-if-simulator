export type BlockKind = "buildings" | "lot" | "plaza";

export interface Block {
  id: string;
  cx: number;
  cz: number;
  /** Full block width including the sidewalk ring. */
  size: number;
  kind: BlockKind;
}

export interface Building {
  id: string;
  blockId: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  /** 0..1 tone index used to vary facade colour. */
  tone: number;
}

export interface PocketPark {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface Road {
  id: string;
  axis: "x" | "z";
  /** Coordinate of the centreline on the perpendicular axis. */
  pos: number;
  width: number;
}

export interface ParkingSpace {
  id: string;
  lotId: string;
  row: number;
  col: number;
  x: number;
  z: number;
  width: number;
  depth: number;
  /** 0..5 palette index for the parked car. */
  carTone: number;
}

export interface StreetTree {
  id: string;
  x: number;
  z: number;
}

export interface TrafficVehicle {
  id: string;
  axis: "x" | "z";
  line: number;
  lane: number;
  direction: 1 | -1;
  speed: number;
  phase: number;
  tone: number;
}

export interface CityLayout {
  name: string;
  extent: number;
  studyAreaM2: number;
  blocks: Block[];
  roads: Road[];
  buildings: Building[];
  pocketParks: PocketPark[];
  streetTrees: StreetTree[];
  spaces: ParkingSpace[];
  /** Space IDs in the exact order they are converted. */
  conversionOrder: string[];
  /** Fixed ranking of all space IDs; the first `parkingDemand` hold a modelled car at baseline. */
  carOrder: string[];
  traffic: TrafficVehicle[];
}

export interface PlantedTree {
  id: string;
  hostSpaceId: string;
  x: number;
  z: number;
}

export interface SimulationResult {
  conversionPct: number;
  totalSpaces: number;
  convertedCount: number;
  retainedCount: number;
  convertedIds: string[];
  retainedIds: string[];
  convertedAreaM2: number;
  /** Plantable (green) area added. */
  greenAreaM2: number;
  /** Converted area that is not plantable (edging / paths). */
  hardscapeM2: number;
  treeCount: number;
  trees: PlantedTree[];
  existingTreeCount: number;
  existingCanopyM2: number;
  addedCanopyM2: number;
  totalCanopyM2: number;
  /** Canopy at maturity as share of the study area. */
  canopyCoverPct: number;

  // --- Parking pressure (illustrative; see lib/config/assumptions.ts) ---
  /** Assumed number of cars needing a space. An assumption, not an observation. */
  parkingDemand: number;
  /** Modelled cars that fit in retained spaces: min(demand, retained). */
  accommodatedDemand: number;
  /** max(0, demand - retained). A shortfall indicator, not predicted displacement. */
  unaccommodatedDemand: number;
  parkingStatus: "accommodated" | "shortfall";
  /** Spaces holding a modelled car in this state (all are retained spaces). */
  parkedIds: string[];
  /** Converted spaces whose baseline car has no modelled space; drawn as amber ghosts. */
  unaccommodatedIds: string[];
  /** Most spaces that can be converted with zero unaccommodated demand. */
  maxConvertedWithoutShortfall: number;
  /** Highest whole-percent slider level with zero unaccommodated demand (-1 if none). */
  maxConversionPctWithoutShortfall: number;
  /** Lowest slider level with a shortfall, or null if none up to 100%. */
  firstShortfallPct: number | null;
}
