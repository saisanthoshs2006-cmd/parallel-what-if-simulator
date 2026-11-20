import { describe, expect, it } from "vitest";
import { ASSUMPTIONS } from "@/lib/config/assumptions";
import { convertedCountFor, parkingThreshold, simulate } from "@/lib/simulation/engine";
import { CITY } from "@/lib/simulation/layout";

const DEMAND = ASSUMPTIONS.illustrativeParkingDemand;
const TOTAL = CITY.spaces.length;

describe("parking pressure: assumptions", () => {
  it("uses the documented illustrative demand of 104 cars (~72% of 144)", () => {
    expect(DEMAND).toBe(104);
    expect(TOTAL).toBe(144);
    expect(DEMAND / TOTAL).toBeCloseTo(0.72, 2);
  });
  it("seeds exactly `demand` unique baseline cars from the fixed car order", () => {
    expect(CITY.carOrder).toHaveLength(TOTAL);
    expect(new Set(CITY.carOrder).size).toBe(TOTAL);
    expect(simulate(0).parkedIds).toHaveLength(DEMAND);
  });
});

describe("parking pressure: key conversion levels", () => {
  it("0%: everything retained, 40 spare, no shortfall", () => {
    const r = simulate(0);
    expect(r.retainedCount).toBe(144);
    expect(r.convertedCount).toBe(0);
    expect(r.parkingDemand).toBe(104);
    expect(r.unaccommodatedDemand).toBe(0);
    expect(r.parkingStatus).toBe("accommodated");
    expect(r.unaccommodatedIds).toEqual([]);
    expect(r.greenAreaM2).toBe(0);
  });

  it("threshold is 28% / 40 spaces; first shortfall at 29%", () => {
    const r = simulate(0);
    expect(r.maxConvertedWithoutShortfall).toBe(40);
    expect(r.maxConversionPctWithoutShortfall).toBe(28);
    expect(r.firstShortfallPct).toBe(29);
    expect(parkingThreshold(TOTAL)).toMatchObject({ maxConversionPctWithoutShortfall: 28, firstShortfallPct: 29 });
  });

  it("last sufficient level (28%): 40 converted, 104 retained, demand exactly met", () => {
    const r = simulate(28);
    expect(r.convertedCount).toBe(40);
    expect(r.retainedCount).toBe(104);
    expect(r.unaccommodatedDemand).toBe(0);
    expect(r.parkingStatus).toBe("accommodated");
    expect(r.parkedIds).toHaveLength(104); // every retained space holds a modelled car
  });

  it("first insufficient level (29%): 42 converted, 102 retained, 2 without space", () => {
    const r = simulate(29);
    expect(r.convertedCount).toBe(42);
    expect(r.retainedCount).toBe(102);
    expect(r.unaccommodatedDemand).toBe(2);
    expect(r.parkingStatus).toBe("shortfall");
    expect(r.unaccommodatedIds).toHaveLength(2);
  });

  it("40%: 58 converted, 86 retained, 18 without space; greenery unchanged", () => {
    const r = simulate(40);
    expect(r.convertedCount).toBe(58);
    expect(r.retainedCount).toBe(86);
    expect(r.unaccommodatedDemand).toBe(18);
    expect(r.accommodatedDemand).toBe(86);
    expect(r.greenAreaM2).toBeCloseTo(507.5, 9);
    expect(r.treeCount).toBe(16);
    expect(r.addedCanopyM2).toBe(320);
  });

  it("100%: nothing retained, all 104 assumed cars without a space", () => {
    const r = simulate(100);
    expect(r.retainedCount).toBe(0);
    expect(r.unaccommodatedDemand).toBe(104);
    expect(r.accommodatedDemand).toBe(0);
    expect(r.parkedIds).toEqual([]);
    expect(r.unaccommodatedIds).toHaveLength(104);
    expect(r.treeCount).toBe(Math.floor((144 * 12.5 * 0.7) / 30));
  });
});

describe("parking pressure: invariants across 0..100%", () => {
  it("unaccommodated demand never decreases as conversion increases", () => {
    let prev = -1;
    for (let p = 0; p <= 100; p++) {
      const u = simulate(p).unaccommodatedDemand;
      expect(u).toBeGreaterThanOrEqual(prev);
      prev = u;
    }
  });

  it("matches max(0, demand - retained) and the threshold at every level", () => {
    const th = parkingThreshold(TOTAL);
    for (let p = 0; p <= 100; p++) {
      const r = simulate(p);
      expect(r.unaccommodatedDemand).toBe(Math.max(0, DEMAND - r.retainedCount));
      expect(r.accommodatedDemand + r.unaccommodatedDemand).toBe(DEMAND);
      expect(r.parkingStatus === "shortfall").toBe(p > th.maxConversionPctWithoutShortfall);
      expect(r.maxConversionPctWithoutShortfall).toBe(28);
    }
  });

  it("stays consistent with existing parking and greenery calculations", () => {
    for (let p = 0; p <= 100; p++) {
      const r = simulate(p);
      expect(r.convertedCount).toBe(convertedCountFor(p, TOTAL));
      expect(r.convertedCount + r.retainedCount).toBe(TOTAL);
      expect(r.greenAreaM2).toBeCloseTo(r.convertedCount * 12.5 * 0.7, 9);
      expect(r.addedCanopyM2).toBe(r.treeCount * 20);
      expect(r.trees).toHaveLength(r.treeCount);
    }
  });

  it("scene IDs agree with the numbers: parked cars sit on retained stalls, ghosts on converted ones", () => {
    for (let p = 0; p <= 100; p++) {
      const r = simulate(p);
      const retained = new Set(r.retainedIds);
      const converted = new Set(r.convertedIds);
      expect(r.parkedIds).toHaveLength(Math.min(DEMAND, r.retainedCount));
      expect(new Set(r.parkedIds).size).toBe(r.parkedIds.length);
      for (const id of r.parkedIds) expect(retained.has(id)).toBe(true);
      expect(r.unaccommodatedIds).toHaveLength(r.unaccommodatedDemand);
      for (const id of r.unaccommodatedIds) expect(converted.has(id)).toBe(true);
    }
  });

  it("is deterministic and the ghost set only grows with conversion", () => {
    expect(simulate(60)).toEqual(simulate(60));
    for (let p = 0; p < 100; p++) {
      const a = new Set(simulate(p).unaccommodatedIds);
      const b = new Set(simulate(p + 1).unaccommodatedIds);
      for (const id of a) expect(b.has(id)).toBe(true);
    }
  });
});
