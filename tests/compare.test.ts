import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCENARIO,
  DEFAULT_SPLIT,
  SPLIT_MAX,
  SPLIT_MIN,
  clampSplit,
  parseScenario,
  serializeScenario,
  type ScenarioState,
} from "@/lib/simulation/scenario-url";
import { createSimulationStore } from "@/store/simulation-store";
import { simulate } from "@/lib/simulation/engine";

describe("compare view: URL", () => {
  it("round-trips view=compare with the divider position", () => {
    const s: ScenarioState = { ...DEFAULT_SCENARIO, conversionPct: 40, view: "compare", split: 62 };
    expect(serializeScenario(s)).toContain("view=compare");
    expect(serializeScenario(s)).toContain("split=62");
    expect(parseScenario(serializeScenario(s))).toEqual(s);
  });
  it("only writes `split` for the compare view (other links stay clean)", () => {
    expect(serializeScenario({ ...DEFAULT_SCENARIO, view: "after", split: 70 })).not.toContain("split");
  });
  it("falls back to the centre for missing or invalid split values", () => {
    for (const bad of ["", "abc", "NaN"]) {
      expect(parseScenario(`view=compare&split=${bad}`).split).toBe(DEFAULT_SPLIT);
    }
    expect(parseScenario("view=compare").split).toBe(DEFAULT_SPLIT);
  });
  it("clamps the divider to the draggable range", () => {
    expect(clampSplit(-20)).toBe(SPLIT_MIN);
    expect(clampSplit(500)).toBe(SPLIT_MAX);
    expect(clampSplit(61.6)).toBe(62);
    expect(clampSplit(NaN)).toBe(DEFAULT_SPLIT);
    expect(parseScenario("view=compare&split=999").split).toBe(SPLIT_MAX);
  });
  it("old links without compare parameters are unaffected", () => {
    expect(parseScenario("conversion=40&view=after")).toEqual({
      ...DEFAULT_SCENARIO,
      conversionPct: 40,
      view: "after",
    });
  });
});

describe("compare view: store", () => {
  it("entering and leaving compare preserves the scenario and the divider", () => {
    const store = createSimulationStore();
    store.getState().setConversion(40);
    store.getState().setView("compare");
    store.getState().setSplit(70);
    store.getState().setView("after");
    const s = store.getState();
    expect([s.conversionPct, s.view, s.split]).toEqual([40, "after", 70]);
    store.getState().setView("compare");
    expect(store.getState().split).toBe(70); // re-entering reopens at the last position
  });
  it("clamps the divider", () => {
    const store = createSimulationStore();
    store.getState().setSplit(1000);
    expect(store.getState().split).toBe(SPLIT_MAX);
    store.getState().setSplit(-5);
    expect(store.getState().split).toBe(SPLIT_MIN);
  });
  it("reset returns to the single-view baseline with a centred divider", () => {
    const store = createSimulationStore();
    store.getState().setView("compare");
    store.getState().setSplit(80);
    store.getState().reset();
    const s = store.getState();
    expect([s.view, s.split, s.conversionPct]).toEqual(["after", DEFAULT_SPLIT, 0]);
  });
  it("a shared compare link opens in compare mode, on the first read", () => {
    const store = createSimulationStore(parseScenario("conversion=40&view=compare&split=62"));
    const s = store.getState();
    expect([s.view, s.split, s.conversionPct, s.hydrated]).toEqual(["compare", 62, 40, true]);
  });
  it("the simulation numbers do not depend on the view mode", () => {
    for (const view of ["before", "after", "compare"] as const) {
      const store = createSimulationStore();
      store.getState().setConversion(40);
      store.getState().setView(view);
      expect(simulate(store.getState().conversionPct)).toEqual(simulate(40));
    }
  });
});
