import * as THREE from "three";
import type { Building } from "@/lib/simulation/types";

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

/** Facade tint per building (same HSL formula the per-building materials used). */
export function buildingTint(tone: number, target = new THREE.Color()) {
  return target.setHSL(0.6, 0.04 + tone * 0.03, 0.5 + tone * 0.12);
}

/**
 * All buildings merged into ONE geometry with two material groups:
 *   group 0 = side walls (vertex-coloured, windowed facade)
 *   group 1 = roofs
 * Bottoms are dropped (never visible). One mesh → 2 draw calls instead of 6 per building.
 */
export function buildBuildingsGeometry(buildings: Building[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const uvs: number[] = [];
  const col: number[] = [];
  const sideIdx: number[] = [];
  const roofIdx: number[] = [];
  const tint = new THREE.Color();
  let base = 0;

  for (const b of buildings) {
    const g = facadeGeometry(b.w, b.h, b.d);
    const p = g.attributes.position;
    const n = g.attributes.normal;
    const t = g.attributes.uv;
    const idx = g.index!;
    buildingTint(b.tone, tint);
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i) + b.x, p.getY(i) + 0.25 + b.h / 2, p.getZ(i) + b.z);
      nor.push(n.getX(i), n.getY(i), n.getZ(i));
      uvs.push(t.getX(i), t.getY(i));
      col.push(tint.r, tint.g, tint.b);
    }
    for (const grp of g.groups) {
      if (grp.materialIndex === 3) continue; // bottom
      const dst = grp.materialIndex === 2 ? roofIdx : sideIdx;
      for (let k = grp.start; k < grp.start + grp.count; k++) dst.push(idx.getX(k) + base);
    }
    base += p.count;
    g.dispose();
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex([...sideIdx, ...roofIdx]);
  geo.addGroup(0, sideIdx.length, 0);
  geo.addGroup(sideIdx.length, roofIdx.length, 1);
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  return geo;
}
