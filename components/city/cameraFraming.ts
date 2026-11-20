import { CITY } from "@/lib/simulation/layout";

export type FramingPreset = "overview" | "focus";

type V3 = [number, number, number];

interface PresetSpec {
  /** Camera bearing around the target, degrees (0 = +z side, 90 = +x side). */
  azimuth: number;
  /** Camera elevation above the ground plane, degrees. */
  elevation: number;
  /** Fraction of half-viewport the framed points may occupy (smaller = more breathing room). */
  fill: number;
}

const SPECS: Record<FramingPreset, PresetSpec> = {
  overview: { azimuth: 38, elevation: 52, fill: 0.9 },
  focus: { azimuth: 22, elevation: 72, fill: 0.93 },
};

/** Corner points of every parking lot (plus label height) — what must always be visible. */
function lotPoints(): V3[] {
  const pts: V3[] = [];
  for (const b of CITY.blocks) {
    if (b.kind !== "lot") continue;
    const r = 17;
    for (const dx of [-r, r]) for (const dz of [-r, r]) pts.push([b.cx + dx, 0, b.cz + dz]);
    pts.push([b.cx, 9, b.cz]);
  }
  return pts;
}

const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a: V3): V3 => {
  const l = Math.hypot(...a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/**
 * Camera position/target that fits all three lots for the given viewport aspect ratio.
 * Pure geometry: solves for the smallest distance at which every framed point projects
 * inside the viewport (horizontally for narrow screens, vertically for wide ones).
 */
export function framePreset(preset: FramingPreset, aspect: number, fovDeg: number) {
  const spec = SPECS[preset];
  const pts = lotPoints();
  const target: V3 = [
    pts.reduce((s, p) => s + p[0], 0) / pts.length,
    0,
    pts.reduce((s, p) => s + p[2], 0) / pts.length,
  ];
  const az = (spec.azimuth * Math.PI) / 180;
  const el = (spec.elevation * Math.PI) / 180;
  const dir = norm([Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)]);
  const right = norm(cross([0, 1, 0], dir));
  const up = cross(dir, right);
  const tanV = Math.tan((fovDeg * Math.PI) / 360);
  const tanH = tanV * Math.max(0.2, aspect);

  let dist = 40;
  for (const p of pts) {
    const q: V3 = [p[0] - target[0], p[1] - target[1], p[2] - target[2]];
    const along = dot(q, dir);
    dist = Math.max(
      dist,
      Math.abs(dot(q, right)) / (spec.fill * tanH) + along,
      Math.abs(dot(q, up)) / (spec.fill * tanV) + along,
    );
  }
  const position: V3 = [target[0] + dir[0] * dist, target[1] + dir[1] * dist, target[2] + dir[2] * dist];
  return { position, target, distance: dist };
}
