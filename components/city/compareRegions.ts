/**
 * Pure helpers for Compare mode (kept free of three.js so they are unit-testable).
 *
 * Layer bitmasks: shared geometry (environment, buildings, traffic, street trees, stall lines) is on
 * layer 0 and drawn in both passes; the scenario-dependent parts exist twice — a baseline copy on
 * layer 1 and a scenario copy on layer 2. Each pass enables layer 0 plus its own side's layer.
 */
export const LAYER_SHARED = 1 << 0;
export const LAYER_BASELINE = 1 << 1;
export const LAYER_SCENARIO = 1 << 2;

export type Side = "baseline" | "scenario";

/** Camera layer mask for the pass that draws `side`. */
export function passMask(side: Side): number {
  return LAYER_SHARED | (side === "baseline" ? LAYER_BASELINE : LAYER_SCENARIO);
}

/** Layer mask for a scenario-dependent copy that belongs to `side`. */
export function dependentMask(side: Side): number {
  return side === "baseline" ? LAYER_BASELINE : LAYER_SCENARIO;
}

export interface PassRect {
  /** CSS pixels, origin at the bottom-left (WebGL convention). Full height. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CompareRegions {
  /** Left region (baseline), or null when the divider is at the far left. */
  baseline: PassRect | null;
  /** Right region (scenario), or null when the divider is at the far right. */
  scenario: PassRect | null;
  /** Divider x in CSS pixels. */
  dividerX: number;
}

/**
 * Split the viewport at `splitPct` (0–100) of its width. The two regions always tile the full
 * viewport exactly, with no gap or overlap, for any size.
 */
export function compareRegions(splitPct: number, width: number, height: number): CompareRegions {
  const pct = Number.isFinite(splitPct) ? Math.min(100, Math.max(0, splitPct)) : 50;
  const w = Math.max(0, Math.round(width));
  const h = Math.max(0, Math.round(height));
  const x = Math.round((pct / 100) * w);
  return {
    baseline: x > 0 ? { x: 0, y: 0, width: x, height: h } : null,
    scenario: w - x > 0 ? { x, y: 0, width: w - x, height: h } : null,
    dividerX: x,
  };
}
