import { describe, expect, it } from "vitest";
import { buildStallTargets, buildTreeTargets } from "@/components/city/instanceTargets";
import { simulate } from "@/lib/simulation/engine";
import { CITY } from "@/lib/simulation/layout";

const sum = (a: Float32Array) => a.reduce((s, v) => s + v, 0);

describe("instanced rendering targets", () => {
  it("instance i is always layout.spaces[i] and mirrors the simulation IDs, at every level", () => {
    for (let p = 0; p <= 100; p++) {
      const sim = simulate(p);
      const t = buildStallTargets(CITY, sim);
      expect(t.converted).toHaveLength(CITY.spaces.length);
      CITY.spaces.forEach((s, i) => {
        expect(t.converted[i]).toBe(sim.convertedIds.includes(s.id) ? 1 : 0);
        expect(t.parked[i]).toBe(sim.parkedIds.includes(s.id) ? 1 : 0);
        expect(t.ghost[i]).toBe(sim.unaccommodatedIds.includes(s.id) ? 1 : 0);
      });
    }
  });

  it("instance counts equal the metrics shown in the panels", () => {
    for (const p of [0, 28, 29, 40, 100]) {
      const sim = simulate(p);
      const t = buildStallTargets(CITY, sim);
      expect(sum(t.converted)).toBe(sim.convertedCount);
      expect(sum(t.parked)).toBe(Math.min(sim.parkingDemand, sim.retainedCount));
      expect(sum(t.ghost)).toBe(sim.unaccommodatedDemand);
      // a stall is never both a parked car and converted/ghost-marked
      CITY.spaces.forEach((_, i) => {
        expect(t.parked[i] * t.converted[i]).toBe(0);
        expect(t.ghost[i] * t.parked[i]).toBe(0);
      });
    }
  });

  it("tree instances match the simulated trees and keep a stable index", () => {
    const potential = simulate(100).trees.map((t) => t.id);
    for (const p of [0, 28, 40, 100]) {
      const sim = simulate(p);
      const t = buildTreeTargets(potential, new Set(sim.trees.map((x) => x.id)));
      expect(sum(t)).toBe(sim.treeCount);
      // present trees form a prefix of the potential list (tree k exists iff k < count)
      for (let k = 0; k < potential.length; k++) expect(t[k]).toBe(k < sim.treeCount ? 1 : 0);
    }
  });
});
