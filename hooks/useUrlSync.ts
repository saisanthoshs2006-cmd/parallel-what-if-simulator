"use client";

import { useEffect } from "react";
import { useSimStoreApi } from "@/store/simulation-store";
import { parseScenario, serializeScenario } from "@/lib/simulation/scenario-url";

/**
 * Mirrors every state change into the query string (history.replaceState, no reloads) and
 * restores state on back/forward. The initial state already comes from the URL (see app/page.tsx).
 */
export function useUrlSync() {
  const store = useSimStoreApi();
  useEffect(() => {
    const unsub = store.subscribe((s, prev) => {
      if (
        s.conversionPct === prev.conversionPct &&
        s.view === prev.view &&
        s.canopy === prev.canopy &&
        s.name === prev.name
      )
        return;
      window.history.replaceState(null, "", `${window.location.pathname}?${serializeScenario(s)}`);
    });
    const onPop = () => store.getState().hydrate(parseScenario(window.location.search));
    window.addEventListener("popstate", onPop);
    return () => {
      unsub();
      window.removeEventListener("popstate", onPop);
    };
  }, [store]);
}
