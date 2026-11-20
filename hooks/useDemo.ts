"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { simulationStore } from "@/store/simulation-store";
import { DEMO_STATE } from "@/lib/simulation/scenario-url";

const HOLD_MS = 900;
const RAMP_MS = 3200;

/** Scripted demo: baseline → animated ramp to the predefined 40% scenario → focused camera. */
export function useDemo() {
  const [playing, setPlaying] = useState(false);
  const raf = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    if (timer.current) clearTimeout(timer.current);
    raf.current = null;
    timer.current = null;
    setPlaying(false);
  }, []);

  const play = useCallback(() => {
    stop();
    const s = simulationStore.getState();
    s.hydrate({ ...DEMO_STATE, conversionPct: 0 });
    s.frame("overview");
    setPlaying(true);
    timer.current = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - start) / RAMP_MS);
        const eased = 1 - Math.pow(1 - k, 2);
        simulationStore.getState().setConversion(Math.round(eased * DEMO_STATE.conversionPct));
        if (k < 1) {
          raf.current = requestAnimationFrame(tick);
        } else {
          simulationStore.getState().loadDemo();
          raf.current = null;
          setPlaying(false);
        }
      };
      raf.current = requestAnimationFrame(tick);
    }, HOLD_MS);
  }, [stop]);

  useEffect(() => stop, [stop]);
  return { playing, play, stop };
}
