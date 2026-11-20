import { describe, expect, it } from "vitest";
import { framePreset } from "@/components/city/cameraFraming";
import { CITY } from "@/lib/simulation/layout";

type V3 = [number, number, number];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: V3): V3 => {
  const l = Math.hypot(...a);
  return [a[0] / l, a[1] / l, a[2] / l];
};
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/** Project a world point with the preset's camera; returns NDC (|x|,|y| <= 1 means visible). */
function ndc(p: V3, cam: ReturnType<typeof framePreset>, aspect: number, fov: number) {
  const f = norm(sub(cam.target, cam.position));
  const r = norm(cross(f, [0, 1, 0]));
  const u = cross(r, f);
  const q = sub(p, cam.position);
  const depth = dot(q, f);
  const t = Math.tan((fov * Math.PI) / 360);
  return { x: dot(q, r) / (depth * t * aspect), y: dot(q, u) / (depth * t), depth };
}

const FOV = 36;
const lotCorners: V3[] = CITY.blocks
  .filter((b) => b.kind === "lot")
  .flatMap((b) => [[-17, -17], [17, -17], [-17, 17], [17, 17]].map(([dx, dz]) => [b.cx + dx, 0, b.cz + dz] as V3));

describe("camera framing", () => {
  for (const preset of ["overview", "focus"] as const) {
    for (const aspect of [0.46, 0.75, 1, 1.6, 2.2]) {
      it(`${preset} keeps all three lots in view at aspect ${aspect}`, () => {
        const cam = framePreset(preset, aspect, FOV);
        for (const p of lotCorners) {
          const n = ndc(p, cam, aspect, FOV);
          expect(n.depth).toBeGreaterThan(0);
          expect(Math.abs(n.x)).toBeLessThanOrEqual(1);
          expect(Math.abs(n.y)).toBeLessThanOrEqual(1);
        }
      });
    }
  }

  it("moves the camera further away for narrower viewports", () => {
    expect(framePreset("overview", 0.5, FOV).distance).toBeGreaterThan(framePreset("overview", 1.6, FOV).distance);
  });

  it("is deterministic", () => {
    expect(framePreset("focus", 1.3, FOV)).toEqual(framePreset("focus", 1.3, FOV));
  });
});
