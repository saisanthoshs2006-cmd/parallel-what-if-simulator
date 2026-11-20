"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSimStoreApi } from "@/store/simulation-store";
import { DEMO_STATE } from "@/lib/simulation/scenario-url";
import { simulate } from "@/lib/simulation/engine";
import { prefersReducedMotion } from "@/lib/motion";

const HOLD_MS = 900;
const RAMP_MS = 3200;
/** Reduced-motion demo: dwell on each meaningful state instead of animating between them. */
const STEP_MS = 1800;

/**
 * Scripted demo.
 *  - Normal: baseline → animated ramp to the predefined 40% scenario → focused camera.
 *  - Reduced motion: baseline → the last level without a parking shortfall → the 40% scenario,
 *    jumping directly between those states.
 */
export function useDemo() {
  const store = useSimStoreApi();
  const [playing, setPlaying] = useState(false);
  const raf = useRef<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stop = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    timers.current.forEach(clearTimeout);
    raf.current = null;
    timers.current = [];
    setPlaying(false);
  }, []);

  const play = useCallback(() => {
    stop();
    const s = store.getState();
    s.hydrate({ ...DEMO_STATE, conversionPct: 0 });
    s.frame("overview");
    setPlaying(true);

    if (prefersReducedMotion()) {
      const threshold = simulate(0).maxConversionPctWithoutShortfall;
      timers.current.push(
        setTimeout(() => store.getState().setConversion(threshold), STEP_MS),
        setTimeout(() => {
          store.getState().loadDemo();
          setPlaying(false);
        }, STEP_MS * 2),
      );
      return;
    }

    timers.current.push(
      setTimeout(() => {
        const start = performance.now();
        const tick = (now: number) => {
          const k = Math.min(1, (now - start) / RAMP_MS);
          const eased = 1 - Math.pow(1 - k, 2);
          store.getState().setConversion(Math.round(eased * DEMO_STATE.conversionPct));
          if (k < 1) {
            raf.current = requestAnimationFrame(tick);
          } else {
            store.getState().loadDemo();
            raf.current = null;
            setPlaying(false);
          }
        };
        raf.current = requestAnimationFrame(tick);
      }, HOLD_MS),
    );
  }, [stop, store]);

  useEffect(() => stop, [stop]);
  return { playing, play, stop };
}
