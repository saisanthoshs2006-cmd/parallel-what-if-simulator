"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSimStoreApi } from "@/store/simulation-store";
import { DEMO_STATE, SPLIT_MAX, SPLIT_MIN } from "@/lib/simulation/scenario-url";
import { simulate } from "@/lib/simulation/engine";
import { prefersReducedMotion } from "@/lib/motion";

const HOLD_MS = 900;
const RAMP_MS = 3200;
/** Reduced-motion demos: dwell on each meaningful state instead of animating between them. */
const STEP_MS = 1800;
/** Reveal: let the camera finish its 1.6 s tween to the top view before the divider appears. */
const CAMERA_MS = 1800;
const SWEEP_MS = 3000;
const SETTLE_MS = 1400;
const HOLD_END_MS = 800;

export type DemoMode = "demo" | "reveal" | null;

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/**
 * Scripted demos, both cancellable at any time (`stop`).
 *
 *  - `play`: baseline → animated ramp to the predefined 40% scenario → focused camera.
 *  - `playReveal`: the same, then Compare mode: the divider sweeps from all-baseline to
 *    all-scenario and settles in the middle for the audience to take over.
 *
 * With reduced motion neither demo animates: they jump between meaningful states (baseline →
 * the last level without a parking shortfall → the 40% scenario → divider positions).
 */
export function useDemo() {
  const store = useSimStoreApi();
  const [mode, setMode] = useState<DemoMode>(null);
  const [revealComplete, setRevealComplete] = useState(false);
  const raf = useRef<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stop = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    timers.current.forEach(clearTimeout);
    raf.current = null;
    timers.current = [];
    setMode(null);
    setRevealComplete(false);
  }, []);

  /** Run `fn(k)` for k in 0..1 over `ms` (eased by `ease`), then `done`. */
  const tween = useCallback((ms: number, fn: (k: number) => void, done: () => void, ease = (t: number) => t) => {
    const start = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / ms);
      fn(ease(k));
      if (k < 1) {
        raf.current = requestAnimationFrame(tick);
      } else {
        raf.current = null;
        done();
      }
    };
    raf.current = requestAnimationFrame(tick);
  }, []);

  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  const begin = useCallback(
    (next: Exclude<DemoMode, null>) => {
      stop();
      const s = store.getState();
      s.hydrate({ ...DEMO_STATE, conversionPct: 0 });
      s.frame("overview");
      setMode(next);
    },
    [stop, store],
  );

  const finish = useCallback((completedReveal = false) => {
    setMode(null);
    setRevealComplete(completedReveal);
  }, []);

  /** Compare-mode tail of the reveal: sweep right→left, then settle in the middle. */
  const revealTail = useCallback(
    (reduced: boolean) => {
      const st = store.getState();
      st.setView("compare");
      st.setSplit(SPLIT_MAX); // all baseline
      if (reduced) {
        later(STEP_MS, () => store.getState().setSplit(SPLIT_MIN)); // all scenario
        later(STEP_MS * 2, () => {
          store.getState().setSplit(50);
          finish(true);
        });
        return;
      }
      later(HOLD_MS, () =>
        tween(
          SWEEP_MS,
          (k) => store.getState().setSplit(Math.round(SPLIT_MAX + (SPLIT_MIN - SPLIT_MAX) * k)),
          () =>
            later(HOLD_END_MS, () =>
              tween(
                SETTLE_MS,
                (k) => store.getState().setSplit(Math.round(SPLIT_MIN + (50 - SPLIT_MIN) * k)),
                () => finish(true),
                easeInOut,
              ),
            ),
          easeInOut,
        ),
      );
    },
    [finish, later, store, tween],
  );

  const run = useCallback(
    (next: Exclude<DemoMode, null>) => {
      begin(next);
      const reveal = next === "reveal";

      if (prefersReducedMotion()) {
        const threshold = simulate(0).maxConversionPctWithoutShortfall;
        later(STEP_MS, () => store.getState().setConversion(threshold));
        later(STEP_MS * 2, () => {
          store.getState().loadDemo();
          if (reveal) later(STEP_MS, () => revealTail(true));
          else finish();
        });
        return;
      }

      later(HOLD_MS, () =>
        tween(
          RAMP_MS,
          (k) => store.getState().setConversion(Math.round((1 - Math.pow(1 - k, 2)) * DEMO_STATE.conversionPct)),
          () => {
            store.getState().loadDemo();
            if (reveal) later(CAMERA_MS, () => revealTail(false));
            else finish();
          },
        ),
      );
    },
    [begin, finish, later, revealTail, store, tween],
  );

  const play = useCallback(() => run("demo"), [run]);
  const playReveal = useCallback(() => run("reveal"), [run]);

  useEffect(() => stop, [stop]);
  return { playing: mode !== null, mode, revealComplete, play, playReveal, stop };
}
