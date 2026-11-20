import { describe, expect, it } from "vitest";
import { buildBuildingsGeometry } from "@/components/city/buildingsGeometry";
import { CITY } from "@/lib/simulation/layout";

describe("merged buildings geometry", () => {
  const geo = buildBuildingsGeometry(CITY.buildings);
  const n = CITY.buildings.length;

  it("collapses every building into one mesh with exactly two material groups", () => {
    expect(n).toBeGreaterThan(0);
    expect(geo.groups).toHaveLength(2);
    expect(geo.groups[0]).toMatchObject({ start: 0, materialIndex: 0 });
    expect(geo.groups[1].materialIndex).toBe(1);
    expect(geo.groups[0].count + geo.groups[1].count).toBe(geo.index!.count);
  });

  it("keeps 4 side faces + 1 roof per building (bottoms dropped)", () => {
    expect(geo.groups[0].count).toBe(n * 4 * 6);
    expect(geo.groups[1].count).toBe(n * 1 * 6);
    expect(geo.attributes.position.count).toBe(n * 24);
  });

  it("has valid indices and per-vertex tint colours", () => {
    const max = geo.attributes.position.count;
    for (let i = 0; i < geo.index!.count; i++) expect(geo.index!.getX(i)).toBeLessThan(max);
    expect(geo.attributes.color.count).toBe(max);
    expect(geo.attributes.uv.count).toBe(max);
  });

  it("places buildings at their layout positions and heights", () => {
    geo.computeBoundingBox();
    const tallest = Math.max(...CITY.buildings.map((b) => b.h));
    expect(geo.boundingBox!.max.y).toBeCloseTo(0.25 + tallest, 5);
    expect(geo.boundingBox!.min.y).toBeCloseTo(0.25, 5);
  });
});
