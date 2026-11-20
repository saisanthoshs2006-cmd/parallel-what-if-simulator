import { createStore, useStore } from "zustand";
import { clampPct } from "@/lib/simulation/engine";
import {
  DEFAULT_SCENARIO,
  DEMO_STATE,
  sanitizeName,
  type ScenarioState,
  type ViewMode,
} from "@/lib/simulation/scenario-url";

export type CameraPreset = "overview" | "focus";

export interface SimulationStore extends ScenarioState {
  /** Camera framing request; `nonce` increments so repeating a preset re-triggers it. */
  camera: { preset: CameraPreset; nonce: number };
  hydrated: boolean;
  setConversion: (pct: number) => void;
  setView: (view: ViewMode) => void;
  setCanopy: (c: ScenarioState["canopy"]) => void;
  setName: (name: string) => void;
  hydrate: (s: ScenarioState) => void;
  frame: (preset: CameraPreset) => void;
  reset: () => void;
  loadDemo: () => void;
}

export function createSimulationStore() {
  return createStore<SimulationStore>()((set, get) => ({
    ...DEFAULT_SCENARIO,
    camera: { preset: "overview", nonce: 0 },
    hydrated: false,
    setConversion: (pct) => set({ conversionPct: clampPct(pct) }),
    setView: (view) => set({ view }),
    setCanopy: (canopy) => set({ canopy }),
    setName: (name) => set({ name: sanitizeName(name) }),
    hydrate: (s) =>
      set({
        name: s.name,
        conversionPct: clampPct(s.conversionPct),
        view: s.view,
        canopy: s.canopy,
        hydrated: true,
      }),
    frame: (preset) => set({ camera: { preset, nonce: get().camera.nonce + 1 } }),
    reset: () =>
      set({
        ...DEFAULT_SCENARIO,
        camera: { preset: "overview", nonce: get().camera.nonce + 1 },
      }),
    loadDemo: () =>
      set({
        ...DEMO_STATE,
        camera: { preset: "focus", nonce: get().camera.nonce + 1 },
      }),
  }));
}

/** App-wide singleton store. Tests create isolated stores via `createSimulationStore`. */
export const simulationStore = createSimulationStore();

export function useSim<T>(selector: (s: SimulationStore) => T): T {
  return useStore(simulationStore, selector);
}
