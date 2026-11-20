"use client";

import { useEffect, useRef, useState } from "react";
import { buildShareUrl } from "@/lib/simulation/scenario-url";
import { useSimStoreApi } from "@/store/simulation-store";

export function useShareScenario() {
  const store = useSimStoreApi();
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  async function share() {
    const url = buildShareUrl(window.location.origin, window.location.pathname, store.getState());
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copy this scenario link:", url);
    }
  }

  return { copied, share };
}
