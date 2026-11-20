"use client";

import { useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { SimulationStoreApi } from "@/store/simulation-store";
import { compareRegions, passMask, type PassRect, type Side } from "./compareRegions";

/**
 * Compare mode renderer. Mounted ONLY while comparing: its priority-1 frame callback takes over
 * rendering from R3F (see R3F `subscribe`: any subscriber with priority > 0 owns the render) and
 * draws the same scene twice with the same camera and full-canvas viewport, scissored to each side
 * of the divider:
 *
 *   left  pass: camera layers = shared + baseline copy
 *   right pass: camera layers = shared + scenario copy
 *
 * Because it is one scene, one camera and one clock, everything shared (roads, buildings, traffic,
 * lighting, shadows) stays perfectly in sync; only the layered, scenario-dependent copies differ.
 * three.js filters shadow casters by the camera's layers, so each side casts only its own shadows.
 *
 * On unmount the scissor test is turned off and the camera layers are restored, and R3F resumes its
 * normal single render.
 */
export function CompareRenderer({ store }: { store: SimulationStoreApi }) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);

  useFrame(({ gl: renderer, scene, camera: cam, size }) => {
    // Read the divider straight from the store each frame (no React re-render while dragging).
    const regions = compareRegions(store.getState().split, size.width, size.height);
    renderer.setScissorTest(true);
    renderer.setViewport(0, 0, size.width, size.height); // full viewport: both sides share one projection
    const passes: Array<[PassRect | null, Side]> = [
      [regions.baseline, "baseline"],
      [regions.scenario, "scenario"],
    ];
    for (const [rect, side] of passes) {
      if (!rect) continue;
      cam.layers.mask = passMask(side);
      renderer.setScissor(rect.x, rect.y, rect.width, rect.height);
      renderer.render(scene, cam);
    }
  }, 1);

  useEffect(
    () => () => {
      gl.setScissorTest(false);
      camera.layers.mask = 1;
    },
    [gl, camera],
  );

  return null;
}
