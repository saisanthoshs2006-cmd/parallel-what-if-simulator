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
  /** Visual only: whether a parked car is drawn here in the baseline. */
  occupied: boolean;
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
}
