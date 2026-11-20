"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { COLORS } from "./palette";

/** Car model (front toward +z). Body/cabin offsets are relative to the car's origin on the ground. */
export const CAR_BODY_GEO = new THREE.BoxGeometry(1.9, 0.7, 4.3);
export const CAR_CABIN_GEO = new THREE.BoxGeometry(1.65, 0.6, 2.2);
export const CAR_BODY_OFFSET = [0, 0.65, 0] as const;
export const CAR_CABIN_OFFSET = [0, 1.25, -0.2] as const;
/** Body colour comes from per-instance colour (one material for all tones). */
export const CAR_BODY_MAT = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.45, metalness: 0.25 });
export const CAR_GLASS_MAT = new THREE.MeshStandardMaterial({ color: "#1b232c", roughness: 0.2, metalness: 0.6 });
export const CAR_TONES = COLORS.cars.map((c) => new THREE.Color(c));

/**
 * Amber marker for a modelled car with no space (illustrative, not a vehicle simulation).
 * Low-profile (< ~1 m) so trees planted on the same strip stay fully visible.
 */
export const GHOST_BODY_GEO = new THREE.BoxGeometry(1.9, 0.45, 4.3);
export const GHOST_OFFSET_Y = 0.25;
export const GHOST_MAT = new THREE.MeshBasicMaterial({
  color: "#f0b442",
  transparent: true,
  opacity: 0.3,
  depthWrite: false,
});
export const GHOST_EDGE_MAT = new THREE.LineBasicMaterial({ color: "#ffc857" });
/** 12 box edges as 24 vertices (xyz triples), local to the ghost body's centre. */
export const GHOST_EDGE_VERTS: Float32Array = (() => {
  const e = new THREE.EdgesGeometry(GHOST_BODY_GEO);
  const a = (e.attributes.position.array as Float32Array).slice();
  e.dispose();
  return a;
})();

/** Facade texture: dark wall with a deterministic pattern of dim lit windows. */
export function useFacadeTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const g = c.getContext("2d")!;
    g.fillStyle = "#6b737c";
    g.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        const lit = x === 1 && y === 0; // one dim lit window per 2×2 tile
        g.fillStyle = lit ? "#b8a478" : "#2c353f";
        g.fillRect(x * 32 + 6, y * 32 + 7, 20, 18);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);
}
