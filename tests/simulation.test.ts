import { describe, expect, it } from "vitest";
import { ASSUMPTIONS } from "@/lib/config/assumptions";
import { clampPct, convertedCountFor, simulate, sweep } from "@/lib/simulation/engine";
import { CITY, createLayout } from "@/lib/simulation/layout";

describe("layout", () => {
  it("has 144 unique parking spaces", () => {
    expect(CITY.spaces).toHaveLength(144);
    expect(new Set(CITY.spaces.map((s) => s.id)).size).toBe(144);
    expect(CITY.conversionOrder).toHaveLength(144);
    expect(new Set(CITY.conversionOrder)).toEqual(new Set(CITY.spaces.map((s) => s.id)));
  });
  it("is deterministic across generations", () => {
    expect(createLayout()).toEqual(createLayout());
  });
});

describe("simulate", () => {
  it("0% conversion is the baseline", () => {
    const r = simulate(0);
    expect(r.convertedCount).toBe(0);
    expect(r.retainedCount).toBe(144);
    expect(r.greenAreaM2).toBe(0);
    expect(r.treeCount).toBe(0);
    expect(r.addedCanopyM2).toBe(0);
    expect(r.convertedIds).toEqual([]);
  });

  it("40% conversion", () => {
    const r = simulate(40);
    expect(r.convertedCount).toBe(58); // round(0.4 * 144)
    expect(r.retainedCount).toBe(86);
    expect(r.convertedAreaM2).toBe(58 * ASSUMPTIONS.areaPerSpaceM2);
    expect(r.greenAreaM2).toBeCloseTo(58 * 12.5 * 0.7, 9);
    expect(r.treeCount).toBe(16);
    expect(r.addedCanopyM2).toBe(16 * ASSUMPTIONS.matureCanopyPerTreeM2);
  });

  it("100% conversion", () => {
    const r = simulate(100);
    expect(r.convertedCount).toBe(144);
    expect(r.retainedCount).toBe(0);
    expect(r.retainedIds).toEqual([]);
    expect(r.treeCount).toBe(Math.floor((144 * 12.5 * 0.7) / 30));
    expect(r.trees).toHaveLength(r.treeCount);
  });

  it("clamps slider boundaries", () => {
    expect(clampPct(-5)).toBe(0);
    expect(clampPct(150)).toBe(100);
    expect(clampPct(NaN)).toBe(0);
    expect(clampPct(39.6)).toBe(40);
    expect(simulate(-10).convertedCount).toBe(0);
    expect(simulate(1000).convertedCount).toBe(144);
  });

  it("selects converted spaces deterministically and progressively", () => {
    expect(simulate(40).convertedIds).toEqual(simulate(40).convertedIds);
    for (let p = 0; p < 100; p++) {
      const a = new Set(simulate(p).convertedIds);
      const b = simulate(p + 1).convertedIds;
      for (const id of a) expect(b).toContain(id); // monotonic: never un-converts
    }
  });

  it("keeps counts and metrics consistent at every percentage", () => {
    for (let p = 0; p <= 100; p++) {
      const r = simulate(p);
      expect(r.convertedIds).toHaveLength(r.convertedCount);
      expect(r.convertedCount).toBe(convertedCountFor(p, r.totalSpaces));
      expect(r.convertedCount + r.retainedCount).toBe(r.totalSpaces);
      expect(new Set([...r.convertedIds, ...r.retainedIds]).size).toBe(r.totalSpaces);
      expect(r.greenAreaM2 + r.hardscapeM2).toBeCloseTo(r.convertedAreaM2, 9);
      expect(r.trees).toHaveLength(r.treeCount);
      expect(r.addedCanopyM2).toBe(r.treeCount * ASSUMPTIONS.matureCanopyPerTreeM2);
      // every tree sits on a converted space (scene and metrics share IDs)
      const conv = new Set(r.convertedIds);
      for (const t of r.trees) expect(conv.has(t.hostSpaceId)).toBe(true);
      // trees fit within the plantable area
      expect(r.treeCount * ASSUMPTIONS.areaPerTreeM2).toBeLessThanOrEqual(r.greenAreaM2 + 1e-6);
    }
  });

  it("tree identity is stable as the slider moves", () => {
    const a = simulate(30).trees;
    const b = simulate(70).trees;
    expect(b.slice(0, a.length)).toEqual(a);
  });

  it("sweep matches simulate", () => {
    for (const row of sweep(10)) expect(row.addedCanopy).toBe(simulate(row.pct).addedCanopyM2);
  });
});
