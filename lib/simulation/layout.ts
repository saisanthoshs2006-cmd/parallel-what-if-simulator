import { LAYOUT_SEED } from "@/lib/config/assumptions";
import { hashString, mulberry32 } from "./prng";
import type {
  Block,
  Building,
  CityLayout,
  ParkingSpace,
  PocketPark,
  Road,
  StreetTree,
  TrafficVehicle,
} from "./types";

/**
 * Generates the fictional "Parallel Heights" neighbourhood.
 *
 * Pure and deterministic: calling it any number of times yields identical
 * output. The 3D scene and the simulation engine both read from this layout,
 * so parking-space IDs are shared between visuals and metrics.
 *
 * Geometry (metres): a 3×3 grid of 40 m blocks separated by 12 m roads.
 * Three blocks are surface parking lots with 48 stalls each (144 total).
 */

const BLOCK_SIZE = 40;
const ROAD_WIDTH = 12;
const PITCH = BLOCK_SIZE + ROAD_WIDTH;
const STALL_W = 2.5;
const STALL_D = 5;
const COLS = 12;
/** Row centre offsets (m) from the lot centre along z. Rows 0/3 edge, 1/2 back-to-back. */
const ROW_Z = [-13.5, -2.5, 2.5, 13.5];
/** Conversion priority of rows: perimeter rows first, central rows last. */
const ROW_RANK = [0, 2, 3, 1];
const LOT_BLOCKS: Record<string, string> = { "0,-1": "A", "-1,0": "B", "1,1": "C" };

function buildBlocks(): Block[] {
  const blocks: Block[] = [];
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const lot = LOT_BLOCKS[`${i},${j}`];
      blocks.push({
        id: lot ? `lot-${lot}` : `blk-${i}-${j}`,
        cx: i * PITCH,
        cz: j * PITCH,
        size: BLOCK_SIZE,
        kind: lot ? "lot" : i === 0 && j === 0 ? "plaza" : "buildings",
      });
    }
  }
  return blocks;
}

function buildRoads(): Road[] {
  return [
    { id: "road-x-", axis: "x", pos: -PITCH / 2, width: ROAD_WIDTH },
    { id: "road-x+", axis: "x", pos: PITCH / 2, width: ROAD_WIDTH },
    { id: "road-z-", axis: "z", pos: -PITCH / 2, width: ROAD_WIDTH },
    { id: "road-z+", axis: "z", pos: PITCH / 2, width: ROAD_WIDTH },
  ];
}

function buildBuildings(blocks: Block[]): { buildings: Building[]; parks: PocketPark[] } {
  const rand = mulberry32(LAYOUT_SEED);
  const buildings: Building[] = [];
  const parks: PocketPark[] = [];
  for (const block of blocks) {
    if (block.kind === "lot") continue;
    const quads = [
      [-8.5, -8.5],
      [8.5, -8.5],
      [-8.5, 8.5],
      [8.5, 8.5],
    ];
    quads.forEach(([qx, qz], q) => {
      const id = `${block.id}-q${q}`;
      const x = block.cx + qx;
      const z = block.cz + qz;
      // Always consume the same number of random values so output is stable.
      const rPark = rand();
      const rW = rand();
      const rD = rand();
      const rH = rand();
      const rTone = rand();
      const plazaPark = block.kind === "plaza" && q === 0;
      if (plazaPark || (block.kind === "buildings" && rPark < 0.12)) {
        parks.push({ id: `park-${id}`, x, z, w: 15, d: 15 });
        return;
      }
      const w = 10.5 + rW * 4;
      const d = 10.5 + rD * 4;
      const h = block.kind === "plaza" ? 12 + rH * 10 : 5 + rH * 9;
      buildings.push({ id: `bld-${id}`, blockId: block.id, x, z, w, d, h, tone: rTone });
    });
  }
  return { buildings, parks };
}

function buildStreetTrees(blocks: Block[]): StreetTree[] {
  const trees: StreetTree[] = [];
  const edge = 18.5;
  for (const b of blocks) {
    const offsets = [-8, 8];
    offsets.forEach((t, k) => {
      trees.push({ id: `st-${b.id}-n${k}`, x: b.cx + t, z: b.cz - edge });
      trees.push({ id: `st-${b.id}-s${k}`, x: b.cx + t, z: b.cz + edge });
      trees.push({ id: `st-${b.id}-w${k}`, x: b.cx - edge, z: b.cz + t });
      trees.push({ id: `st-${b.id}-e${k}`, x: b.cx + edge, z: b.cz + t });
    });
  }
  return trees;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function buildSpaces(blocks: Block[]): ParkingSpace[] {
  const spaces: ParkingSpace[] = [];
  for (const b of blocks) {
    if (b.kind !== "lot") continue;
    const lot = b.id.replace("lot-", "");
    for (let row = 0; row < ROW_Z.length; row++) {
      for (let col = 0; col < COLS; col++) {
        const id = `${lot}-R${row}-S${pad2(col)}`;
        const h = hashString(id);
        spaces.push({
          id,
          lotId: b.id,
          row,
          col,
          x: b.cx - (COLS * STALL_W) / 2 + STALL_W / 2 + col * STALL_W,
          z: b.cz + ROW_Z[row],
          width: STALL_W,
          depth: STALL_D,
          carTone: (h >>> 8) % 6,
        });
      }
    }
  }
  return spaces;
}

/**
 * Conversion order: perimeter rows first, then by stall column, then by lot.
 * Converting the first N entries gives contiguous green strips that grow
 * simultaneously in all three lots. No randomness involved.
 */
function buildConversionOrder(spaces: ParkingSpace[]): string[] {
  const lotIndex = (lotId: string) => lotId.charCodeAt(lotId.length - 1);
  return [...spaces]
    .sort(
      (a, b) =>
        ROW_RANK[a.row] - ROW_RANK[b.row] ||
        a.col - b.col ||
        lotIndex(a.lotId) - lotIndex(b.lotId),
    )
    .map((s) => s.id);
}

/**
 * Fixed, hash-ranked ordering of every stall. The engine treats the first
 * `parkingDemand` entries as the stalls holding a modelled car at baseline.
 * Deterministic (string hash, no PRNG state) and independent of conversion.
 */
function buildCarOrder(spaces: ParkingSpace[]): string[] {
  return [...spaces]
    .map((s) => ({ id: s.id, h: hashString(`car:${s.id}`) }))
    .sort((a, b) => a.h - b.h || (a.id < b.id ? -1 : 1))
    .map((s) => s.id);
}

function buildTraffic(): TrafficVehicle[] {
  const lane = 3;
  const out: TrafficVehicle[] = [];
  const lines: Array<["x" | "z", number]> = [
    ["x", -PITCH / 2],
    ["x", PITCH / 2],
    ["z", -PITCH / 2],
    ["z", PITCH / 2],
  ];
  lines.forEach(([axis, line], i) => {
    const dir: 1 | -1 = i % 2 === 0 ? 1 : -1;
    out.push({
      id: `veh-${i}-a`,
      axis,
      line,
      lane: lane * dir,
      direction: dir,
      speed: 5 + (i % 3) * 1.5,
      phase: (i * 0.23) % 1,
      tone: i % 6,
    });
    out.push({
      id: `veh-${i}-b`,
      axis,
      line,
      lane: -lane * dir,
      direction: (dir * -1) as 1 | -1,
      speed: 4.5 + ((i + 1) % 3) * 1.5,
      phase: (0.55 + i * 0.17) % 1,
      tone: (i + 3) % 6,
    });
  });
  return out;
}

function createLayout(): CityLayout {
  const blocks = buildBlocks();
  const { buildings, parks } = buildBuildings(blocks);
  const spaces = buildSpaces(blocks);
  const extent = PITCH + BLOCK_SIZE; // half-width of built area (72 m)
  return {
    name: "Parallel Heights (fictional)",
    extent,
    studyAreaM2: (extent * 2) ** 2,
    blocks,
    roads: buildRoads(),
    buildings,
    pocketParks: parks,
    streetTrees: buildStreetTrees(blocks),
    spaces,
    conversionOrder: buildConversionOrder(spaces),
    carOrder: buildCarOrder(spaces),
    traffic: buildTraffic(),
  };
}

export const CITY: CityLayout = createLayout();
export { createLayout };
