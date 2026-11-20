import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCENARIO,
  DEMO_STATE,
  parseScenario,
  serializeScenario,
  type ScenarioState,
} from "@/lib/simulation/scenario-url";
import { createSimulationStore } from "@/store/simulation-store";
import { simulate } from "@/lib/simulation/engine";

describe("scenario URL", () => {
  it("round-trips state", () => {
    const s: ScenarioState = { name: "Pilot & test", conversionPct: 63, view: "before", canopy: "sapling" };
    expect(parseScenario(serializeScenario(s))).toEqual(s);
  });
  it("round-trips the demo and default scenarios", () => {
    expect(parseScenario(serializeScenario(DEMO_STATE))).toEqual(DEMO_STATE);
    expect(parseScenario(serializeScenario(DEFAULT_SCENARIO))).toEqual(DEFAULT_SCENARIO);
  });
  it("falls back to defaults for missing or invalid params", () => {
    expect(parseScenario("")).toEqual(DEFAULT_SCENARIO);
    expect(parseScenario("conversion=abc&view=x&canopy=y")).toEqual(DEFAULT_SCENARIO);
  });
  it("clamps out-of-range conversion", () => {
    expect(parseScenario("conversion=999").conversionPct).toBe(100);
    expect(parseScenario("conversion=-4").conversionPct).toBe(0);
  });
  it("restored URL reproduces identical simulation results", () => {
    const restored = parseScenario("conversion=40&view=after");
    expect(simulate(restored.conversionPct)).toEqual(simulate(40));
  });
});

describe("store", () => {
  it("clamps slider input", () => {
    const store = createSimulationStore();
    store.getState().setConversion(250);
    expect(store.getState().conversionPct).toBe(100);
    store.getState().setConversion(-1);
    expect(store.getState().conversionPct).toBe(0);
  });
  it("reset restores the baseline", () => {
    const store = createSimulationStore();
    store.getState().setConversion(77);
    store.getState().setView("before");
    store.getState().setName("Custom");
    store.getState().reset();
    const { conversionPct, view, name, canopy } = store.getState();
    expect({ conversionPct, view, name, canopy }).toEqual(DEFAULT_SCENARIO);
  });
  it("loadDemo sets the predefined 40% scenario", () => {
    const store = createSimulationStore();
    store.getState().loadDemo();
    expect(store.getState().conversionPct).toBe(40);
    expect(store.getState().view).toBe("after");
  });
  it("hydrate restores a shared scenario", () => {
    const store = createSimulationStore();
    store.getState().hydrate(parseScenario("conversion=55&view=before"));
    expect(store.getState().conversionPct).toBe(55);
    expect(store.getState().view).toBe("before");
    expect(store.getState().hydrated).toBe(true);
  });
});
