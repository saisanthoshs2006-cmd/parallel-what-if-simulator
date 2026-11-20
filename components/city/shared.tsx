"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { COLORS } from "./palette";

const carBody = new THREE.BoxGeometry(1.9, 0.7, 4.3);
const carCabin = new THREE.BoxGeometry(1.65, 0.6, 2.2);
const carMats = COLORS.cars.map(
  (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.25 }),
);
const glass = new THREE.MeshStandardMaterial({ color: "#1b232c", roughness: 0.2, metalness: 0.6 });

/** Low-poly car, front toward +z. Shares geometry/materials across all instances. */
export function Car({ tone }: { tone: number }) {
  const mat = carMats[tone % carMats.length];
  return (
    <group>
      <mesh geometry={carBody} material={mat} position={[0, 0.65, 0]} castShadow />
      <mesh geometry={carCabin} material={glass} position={[0, 1.25, -0.2]} castShadow />
    </group>
  );
}

/** Facade texture: dark wall with a deterministic pattern of warm lit windows. */
export function useFacadeTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const g = c.getContext("2d")!;
    g.fillStyle = "#59616b";
    g.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        const lit = (x * 7 + y * 13) % 3 === 0;
        g.fillStyle = lit ? "#f2cf86" : "#27313c";
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

/** Box geometry whose side-face UVs are scaled so windows keep a constant real-world size. */
export function facadeGeometry(w: number, h: number, d: number) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z (4 verts each)
  const faceWidth = [d, d, 1, 1, w, w];
  for (let f = 0; f < 6; f++) {
    if (f === 2 || f === 3) continue;
    for (let i = 0; i < 4; i++) {
      const idx = f * 4 + i;
      uv.setXY(idx, (uv.getX(idx) * faceWidth[f]) / 6, (uv.getY(idx) * h) / 6);
    }
  }
  uv.needsUpdate = true;
  return g;
}
