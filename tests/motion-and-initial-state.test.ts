import { afterEach, describe, expect, it } from "vitest";
import { __resetReducedMotionForTests, prefersReducedMotion, subscribeReducedMotion } from "@/lib/motion";
import { createSimulationStore } from "@/store/simulation-store";
import {
  DEFAULT_SCENARIO,
  parseScenario,
  searchParamsToScenario,
  serializeScenario,
} from "@/lib/simulation/scenario-url";

function stubMatchMedia(initial: boolean) {
  const listeners = new Set<(e: { matches: boolean }) => void>();
  const mql = {
    matches: initial,
    addEventListener: (_: string, l: (e: { matches: boolean }) => void) => listeners.add(l),
    removeEventListener: (_: string, l: (e: { matches: boolean }) => void) => listeners.delete(l),
  };
  (globalThis as unknown as { window: unknown }).window = { matchMedia: () => mql };
  return {
    set(v: boolean) {
      mql.matches = v;
      listeners.forEach((l) => l({ matches: v }));
    },
  };
}

afterEach(() => {
  __resetReducedMotionForTests();
  delete (globalThis as { window?: unknown }).window;
});

describe("reduced-motion preference", () => {
  it("reads the media query", () => {
    stubMatchMedia(true);
    expect(prefersReducedMotion()).toBe(true);
  });
  it("is false without a window (server) or when not requested", () => {
    expect(prefersReducedMotion()).toBe(false);
    __resetReducedMotionForTests();
    stubMatchMedia(false);
    expect(prefersReducedMotion()).toBe(false);
  });
  it("follows live changes and notifies subscribers", () => {
    const mq = stubMatchMedia(false);
    let calls = 0;
    const off = subscribeReducedMotion(() => calls++);
    mq.set(true);
    expect(prefersReducedMotion()).toBe(true);
    mq.set(false);
    expect(prefersReducedMotion()).toBe(false);
    expect(calls).toBe(2);
    off();
    mq.set(true);
    expect(calls).toBe(2);
  });
});

describe("initial scenario state (shared URLs)", () => {
  it("a store created from a shared scenario is correct and hydrated from the first read", () => {
    const store = createSimulationStore(parseScenario("conversion=40&view=before&canopy=sapling&name=Pilot"));
    const s = store.getState();
    expect([s.conversionPct, s.view, s.canopy, s.name, s.hydrated]).toEqual([40, "before", "sapling", "Pilot", true]);
  });
  it("without an initial scenario the store starts at the baseline", () => {
    const s = createSimulationStore().getState();
    expect(s.conversionPct).toBe(0);
    expect(s.hydrated).toBe(false);
  });
  it("stores are isolated from each other (no shared singleton state)", () => {
    const a = createSimulationStore(parseScenario("conversion=80"));
    const b = createSimulationStore();
    a.getState().setConversion(90);
    expect(b.getState().conversionPct).toBe(0);
  });
  it("searchParamsToScenario handles strings, arrays, missing and hostile values", () => {
    expect(searchParamsToScenario({})).toEqual(DEFAULT_SCENARIO);
    expect(searchParamsToScenario({ conversion: "40", view: "after" }).conversionPct).toBe(40);
    expect(searchParamsToScenario({ conversion: ["40", "90"] }).conversionPct).toBe(40);
    expect(searchParamsToScenario({ conversion: undefined, view: "zzz" })).toEqual(DEFAULT_SCENARIO);
    expect(searchParamsToScenario({ conversion: "1e3" }).conversionPct).toBe(100);
    expect(searchParamsToScenario({ name: "A".repeat(500) }).name).toHaveLength(60);
  });
  it("server-parsed state equals client-parsed state for the same URL", () => {
    const qs = serializeScenario(parseScenario("conversion=46&view=after&canopy=mature&name=x"));
    expect(searchParamsToScenario(Object.fromEntries(new URLSearchParams(qs)))).toEqual(parseScenario(qs));
  });
});
