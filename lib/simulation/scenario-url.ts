import { DEMO_SCENARIO } from "@/lib/config/assumptions";
import { COMPARE_ENABLED } from "@/lib/config/features";
import { clampPct } from "./engine";

export type ViewMode = "before" | "after" | "compare";
export type CanopyStage = "sapling" | "mature";

export interface ScenarioState {
  name: string;
  conversionPct: number;
  view: ViewMode;
  canopy: CanopyStage;
  /** Compare-mode divider position, whole percent of the viewport width (baseline on the left). */
  split: number;
}

export const DEFAULT_SCENARIO_NAME = "Parking to green";
const LEGACY_DEMO_NAME = "Convert 40% of parking to green space";
export const MAX_NAME_LENGTH = 60;
export const SPLIT_MIN = 3;
export const SPLIT_MAX = 97;
export const DEFAULT_SPLIT = 50;

/** Clamp a divider position to the draggable range; non-finite input → centre. */
export function clampSplit(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SPLIT;
  return Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, Math.round(value)));
}

export const DEFAULT_SCENARIO: ScenarioState = {
  name: DEFAULT_SCENARIO_NAME,
  conversionPct: 0,
  view: "after",
  canopy: "mature",
  split: DEFAULT_SPLIT,
};

export const DEMO_STATE: ScenarioState = {
  name: DEMO_SCENARIO.name,
  conversionPct: DEMO_SCENARIO.conversionPct,
  view: "after",
  canopy: "mature",
  split: DEFAULT_SPLIT,
};

export function sanitizeName(raw: string): string {
  return raw.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, MAX_NAME_LENGTH);
}

/** Old demo links used a fixed percentage in the title. Keep that title only at 40%. */
export function normalizeScenarioName(name: string, conversionPct: number): string {
  return name === LEGACY_DEMO_NAME && clampPct(conversionPct) !== 40 ? DEFAULT_SCENARIO_NAME : name;
}

/** Serialise to a query string (no leading "?"). Always explicit, so links are self-describing. */
export function serializeScenario(s: ScenarioState): string {
  const p = new URLSearchParams();
  p.set("conversion", String(clampPct(s.conversionPct)));
  p.set("view", s.view);
  p.set("canopy", s.canopy);
  if (s.view === "compare") p.set("split", String(clampSplit(s.split)));
  const name = normalizeScenarioName(sanitizeName(s.name).trim(), s.conversionPct);
  if (name && name !== DEFAULT_SCENARIO_NAME) p.set("name", name);
  return p.toString();
}

/** Parse untrusted query input. Invalid or missing values fall back to defaults. */
export function parseScenario(search: string | URLSearchParams): ScenarioState {
  const p = typeof search === "string" ? new URLSearchParams(search) : search;
  const rawPct = p.get("conversion");
  const pct = rawPct !== null && rawPct.trim() !== "" ? Number(rawPct) : NaN;
  const view = p.get("view");
  const canopy = p.get("canopy");
  const rawSplit = p.get("split");
  const split = rawSplit !== null && rawSplit.trim() !== "" ? Number(rawSplit) : NaN;
  const name = sanitizeName(p.get("name") ?? "").trim();
  return {
    name: normalizeScenarioName(name || DEFAULT_SCENARIO.name, Number.isFinite(pct) ? pct : 0),
    conversionPct: Number.isFinite(pct) ? clampPct(pct) : DEFAULT_SCENARIO.conversionPct,
    view:
      view === "before" || view === "after" || (view === "compare" && COMPARE_ENABLED)
        ? view
        : DEFAULT_SCENARIO.view,
    canopy: canopy === "sapling" || canopy === "mature" ? canopy : DEFAULT_SCENARIO.canopy,
    split: Number.isFinite(split) ? clampSplit(split) : DEFAULT_SPLIT,
  };
}

/**
 * Convert a Next.js `searchParams` object (values may be string | string[] | undefined)
 * into a scenario. Repeated params use the first value, matching `URLSearchParams.get`.
 */
export function searchParamsToScenario(sp: Record<string, string | string[] | undefined>): ScenarioState {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const first = Array.isArray(v) ? v[0] : v;
    if (typeof first === "string") p.set(k, first);
  }
  return parseScenario(p);
}

export function buildShareUrl(origin: string, pathname: string, s: ScenarioState): string {
  return `${origin}${pathname}?${serializeScenario(s)}`;
}
