import { describe, expect, it } from "vitest";
import {
  LAYER_BASELINE,
  LAYER_SCENARIO,
  LAYER_SHARED,
  compareRegions,
  dependentMask,
  passMask,
  splitFromKey,
  splitFromPointer,
} from "@/components/city/compareRegions";
import { DEFAULT_SPLIT, SPLIT_MAX, SPLIT_MIN } from "@/lib/simulation/scenario-url";

describe("compare layers", () => {
  it("uses distinct bits for shared, baseline and scenario geometry", () => {
    expect(new Set([LAYER_SHARED, LAYER_BASELINE, LAYER_SCENARIO]).size).toBe(3);
    expect(LAYER_SHARED & LAYER_BASELINE & LAYER_SCENARIO).toBe(0);
  });
  it("each pass sees shared geometry plus only its own side", () => {
    expect(passMask("baseline") & LAYER_SHARED).toBeTruthy();
    expect(passMask("baseline") & dependentMask("baseline")).toBeTruthy();
    expect(passMask("baseline") & dependentMask("scenario")).toBe(0);
    expect(passMask("scenario") & dependentMask("scenario")).toBeTruthy();
    expect(passMask("scenario") & dependentMask("baseline")).toBe(0);
  });
  it("the default layer (mask 1) is the shared layer, so single-view rendering is unchanged", () => {
    expect(LAYER_SHARED).toBe(1);
  });
});

describe("compareRegions", () => {
  it("splits the viewport at the divider with baseline on the left", () => {
    const r = compareRegions(62, 1000, 600);
    expect(r.dividerX).toBe(620);
    expect(r.baseline).toEqual({ x: 0, y: 0, width: 620, height: 600 });
    expect(r.scenario).toEqual({ x: 620, y: 0, width: 380, height: 600 });
  });
  it("always tiles the whole viewport with no gap or overlap", () => {
    for (const w of [301, 390, 760, 1280, 1441]) {
      for (let p = 0; p <= 100; p += 1) {
        const r = compareRegions(p, w, 500);
        const left = r.baseline?.width ?? 0;
        const right = r.scenario?.width ?? 0;
        expect(left + right).toBe(w);
        if (r.baseline && r.scenario) expect(r.scenario.x).toBe(r.baseline.width);
      }
    }
  });
  it("skips a pass entirely at the extremes", () => {
    expect(compareRegions(0, 800, 400).baseline).toBeNull();
    expect(compareRegions(0, 800, 400).scenario?.width).toBe(800);
    expect(compareRegions(100, 800, 400).scenario).toBeNull();
    expect(compareRegions(100, 800, 400).baseline?.width).toBe(800);
  });
  it("clamps out-of-range and invalid input", () => {
    expect(compareRegions(-30, 800, 400).dividerX).toBe(0);
    expect(compareRegions(400, 800, 400).dividerX).toBe(800);
    expect(compareRegions(NaN, 800, 400).dividerX).toBe(400);
  });
  it("is deterministic", () => {
    expect(compareRegions(37, 913, 457)).toEqual(compareRegions(37, 913, 457));
  });
});

describe("divider input", () => {
  it("maps a pointer x to a clamped whole-percent position", () => {
    expect(splitFromPointer(500, 100, 800)).toBe(50);
    expect(splitFromPointer(100, 100, 800)).toBe(SPLIT_MIN); // far left clamps
    expect(splitFromPointer(5000, 100, 800)).toBe(SPLIT_MAX); // far right clamps
    expect(splitFromPointer(300, 100, 800)).toBe(25);
  });
  it("falls back to the centre for a degenerate element", () => {
    expect(splitFromPointer(10, 0, 0)).toBe(DEFAULT_SPLIT);
    expect(splitFromPointer(NaN, 0, 800)).toBe(DEFAULT_SPLIT);
  });
  it("steps with the arrow keys, bigger with Shift/PageUp/PageDown, and jumps with Home/End", () => {
    expect(splitFromKey(50, "ArrowRight")).toBe(52);
    expect(splitFromKey(50, "ArrowLeft")).toBe(48);
    expect(splitFromKey(50, "ArrowRight", true)).toBe(60);
    expect(splitFromKey(50, "PageDown")).toBe(40);
    expect(splitFromKey(50, "Home")).toBe(SPLIT_MIN);
    expect(splitFromKey(50, "End")).toBe(SPLIT_MAX);
  });
  it("never leaves the draggable range and ignores other keys", () => {
    expect(splitFromKey(SPLIT_MAX, "ArrowRight", true)).toBe(SPLIT_MAX);
    expect(splitFromKey(SPLIT_MIN, "ArrowLeft", true)).toBe(SPLIT_MIN);
    expect(splitFromKey(50, "a")).toBeNull();
    expect(splitFromKey(50, "Tab")).toBeNull();
  });
});
