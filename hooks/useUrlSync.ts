"use client";

import { useEffect } from "react";
import { simulationStore } from "@/store/simulation-store";
import { parseScenario, serializeScenario } from "@/lib/simulation/scenario-url";

/**
 * Restores scenario state from the URL on first load, then mirrors every
 * state change back into the query string (history.replaceState, no reloads).
 */
export function useUrlSync() {
  useEffect(() => {
    const { hydrate } = simulationStore.getState();
    hydrate(parseScenario(window.location.search));

    const unsub = simulationStore.subscribe((s, prev) => {
      if (
        s.conversionPct === prev.conversionPct &&
        s.view === prev.view &&
        s.canopy === prev.canopy &&
        s.name === prev.name
      )
        return;
      const qs = serializeScenario(s);
      window.history.replaceState(null, "", `${window.location.pathname}?${qs}`);
    });

    const onPop = () => simulationStore.getState().hydrate(parseScenario(window.location.search));
    window.addEventListener("popstate", onPop);
    return () => {
      unsub();
      window.removeEventListener("popstate", onPop);
    };
  }, []);
}
