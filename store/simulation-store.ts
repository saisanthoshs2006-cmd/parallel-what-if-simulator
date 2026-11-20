"use client";

import { createContext, createElement, useContext, useRef, type ReactNode } from "react";
import { createStore, useStore, type StoreApi } from "zustand";
import { clampPct } from "@/lib/simulation/engine";
import {
  DEFAULT_SCENARIO,
  DEMO_STATE,
  clampSplit,
  normalizeScenarioName,
  sanitizeName,
  type ScenarioState,
  type ViewMode,
} from "@/lib/simulation/scenario-url";

export type CameraPreset = "overview" | "focus";

export interface SimulationStore extends ScenarioState {
  /** Camera framing request; `nonce` increments so repeating a preset re-triggers it. */
  camera: { preset: CameraPreset; nonce: number };
  /** True when the state came from (or has been synced with) the URL. */
  hydrated: boolean;
  setConversion: (pct: number) => void;
  setView: (view: ViewMode) => void;
  /** Move the Compare divider (whole percent, clamped). */
  setSplit: (pct: number) => void;
  setCanopy: (c: ScenarioState["canopy"]) => void;
  setName: (name: string) => void;
  hydrate: (s: ScenarioState) => void;
  frame: (preset: CameraPreset) => void;
  reset: () => void;
  loadDemo: () => void;
}

/** Create an isolated store. Pass `initial` (e.g. parsed from the URL) so the very first render is correct. */
export function createSimulationStore(initial?: ScenarioState) {
  return createStore<SimulationStore>()((set, get) => ({
    ...DEFAULT_SCENARIO,
    ...(initial ? {
      ...initial,
      name: normalizeScenarioName(initial.name, initial.conversionPct),
      conversionPct: clampPct(initial.conversionPct),
      split: clampSplit(initial.split),
    } : {}),
    camera: { preset: "overview", nonce: 0 },
    hydrated: initial !== undefined,
    setConversion: (pct) => set((s) => {
      const conversionPct = clampPct(pct);
      return { conversionPct, name: normalizeScenarioName(s.name, conversionPct) };
    }),
    setView: (view) => set({ view }),
    setSplit: (pct) => set({ split: clampSplit(pct) }),
    setCanopy: (canopy) => set({ canopy }),
    setName: (name) => set({ name: sanitizeName(name) }),
    hydrate: (s) =>
      set({
        name: normalizeScenarioName(s.name, s.conversionPct),
        conversionPct: clampPct(s.conversionPct),
        view: s.view,
        canopy: s.canopy,
        split: clampSplit(s.split),
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

export type SimulationStoreApi = StoreApi<SimulationStore>;

const StoreContext = createContext<SimulationStoreApi | null>(null);

/**
 * Per-instance store provider. Each render tree (and each server request) gets its own store, so
 * nothing leaks between requests, and `initial` makes the first server render and first client
 * render identical.
 */
export function SimulationStoreProvider({ initial, children }: { initial?: ScenarioState; children: ReactNode }) {
  const ref = useRef<SimulationStoreApi | null>(null);
  if (ref.current === null) ref.current = createSimulationStore(initial);
  return createElement(StoreContext.Provider, { value: ref.current }, children);
}

export function useSimStoreApi(): SimulationStoreApi {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useSimStoreApi must be used inside <SimulationStoreProvider>");
  return store;
}

export function useSim<T>(selector: (s: SimulationStore) => T): T {
  return useStore(useSimStoreApi(), selector);
}
