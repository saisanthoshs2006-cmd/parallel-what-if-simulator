"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { ChevronsLeftRight } from "lucide-react";
import { SPLIT_MAX, SPLIT_MIN } from "@/lib/simulation/scenario-url";
import { splitFromKey, splitFromPointer } from "./compareRegions";

/**
 * The Compare divider: a DOM overlay on top of the 3D viewport (the canvas itself is untouched).
 * Only the thin line and its handle accept pointer input, so orbit / pan / zoom keep working
 * everywhere else. It is a real slider for assistive tech and keyboards, and uses pointer capture
 * so mouse, touch and pen drags keep tracking even when the pointer leaves the handle.
 * No animation: it is direct manipulation, so reduced-motion needs no special handling.
 */
export function CompareDivider({
  split,
  scenarioPct,
  onChange,
  onInteract,
}: {
  /** Divider position, whole percent from the left edge. */
  split: number;
  /** Conversion percentage of the scenario shown on the right. */
  scenarioPct: number;
  onChange: (split: number) => void;
  /** Called when the user takes over (e.g. to stop a playing demo). */
  onInteract?: () => void;
}) {
  const dragging = useRef(false);

  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.parentElement!.getBoundingClientRect();
    onChange(splitFromPointer(e.clientX, box.left, box.width));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Capture can fail for synthetic or already-released pointers; dragging still works while over the handle.
    }
    dragging.current = true;
    onInteract?.();
    fromPointer(e);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) fromPointer(e);
  };
  const end = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const next = splitFromKey(split, e.key, e.shiftKey);
    if (next === null) return;
    e.preventDefault();
    onInteract?.();
    onChange(next);
  };

  const scenarioLabel = `${scenarioPct}% scenario`;
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {split >= 14 && (
        <div
          className="absolute bottom-16 rounded-md border border-white/10 bg-bg/85 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-mute"
          style={{ right: `calc(${100 - split}% + 22px)` }}
        >
          Baseline
        </div>
      )}
      {split <= 86 && (
        <div
          className="absolute bottom-16 rounded-md border border-leaf/30 bg-bg/85 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-leaf"
          style={{ left: `calc(${split}% + 22px)` }}
        >
          {scenarioLabel}
        </div>
      )}
      {scenarioPct === 0 && (
        <p
          role="status"
          className="absolute inset-x-0 bottom-28 mx-auto w-fit max-w-[80%] rounded-md border border-white/10 bg-bg/85 px-3 py-1.5 text-center text-[11px] text-mute"
        >
          Both sides match at 0% — move the slider to convert parking.
        </p>
      )}

      <div
        role="slider"
        tabIndex={0}
        aria-label="Compare divider"
        aria-orientation="horizontal"
        aria-valuemin={SPLIT_MIN}
        aria-valuemax={SPLIT_MAX}
        aria-valuenow={split}
        aria-valuetext={`Baseline on the left, ${scenarioLabel} on the right. Divider ${split} percent across.`}
        className="compare-divider pointer-events-auto absolute inset-y-0 w-3 -translate-x-1/2 cursor-ew-resize touch-none select-none outline-none"
        style={{ left: `${split}%` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
        onKeyDown={onKeyDown}
      >
        <span aria-hidden className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white/85 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]" />
        <span
          aria-hidden
          className="compare-divider-knob absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-bg/90 text-white shadow-lg"
        >
          <ChevronsLeftRight className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}
