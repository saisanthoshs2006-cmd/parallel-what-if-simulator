"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CityLayout } from "@/lib/simulation/types";
import { hashString } from "@/lib/simulation/prng";
import { prefersReducedMotion } from "@/lib/motion";
import { COLORS } from "./palette";
import {
  CAR_BODY_GEO,
  CAR_BODY_MAT,
  CAR_BODY_OFFSET,
  CAR_CABIN_GEO,
  CAR_CABIN_OFFSET,
  CAR_GLASS_MAT,
  CAR_TONES,
  GHOST_BODY_GEO,
  GHOST_EDGE_MAT,
  GHOST_EDGE_VERTS,
  GHOST_MAT,
  GHOST_OFFSET_Y,
} from "./shared";
import type { StallTargets } from "./instanceTargets";

const BASE_Y = 0.28;
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const bushGeo = new THREE.IcosahedronGeometry(0.55, 1);
const edgeMat = new THREE.MeshStandardMaterial({ color: COLORS.curb, roughness: 0.9 });
const grassMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1 });
const bushMat = new THREE.MeshStandardMaterial({ color: COLORS.bush, roughness: 1, flatShading: true });
const GRASS_TONES = [COLORS.grassA, COLORS.grassB, COLORS.grassC].map((c) => new THREE.Color(c));
const GHOST_VERTS = GHOST_EDGE_VERTS.length / 3; // 24

const dummy = new THREE.Object3D();
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

/**
 * Every repeated parking-lot element as instanced meshes. Instance i is ALWAYS
 * `layout.spaces[i]`, and its target state comes from the simulation (see instanceTargets.ts),
 * so the 3D view and the metrics share the same stall IDs.
 *
 *   edge / grass / bush  → planted-strip pieces (grow with `converted`)
 *   car body / cabin     → modelled parked cars (scale with `parked`)
 *   ghost fill / edges   → amber "no space" markers (scale with `ghost`)
 *
 * ~1,000 per-stall meshes become 8 draw calls. Animation state lives in typed arrays and is
 * only advanced while something is moving; reduced motion snaps straight to the target.
 */
export function ParkingInstances({ layout, targets }: { layout: CityLayout; targets: StallTargets }) {
  const spaces = layout.spaces;
  const n = spaces.length;

  const edgeRef = useRef<THREE.InstancedMesh>(null);
  const grassRef = useRef<THREE.InstancedMesh>(null);
  const bushRef = useRef<THREE.InstancedMesh>(null);
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const cabinRef = useRef<THREE.InstancedMesh>(null);
  const ghostRef = useRef<THREE.InstancedMesh>(null);
  const linesRef = useRef<THREE.LineSegments>(null);

  // Static per-stall data.
  const stat = useMemo(() => {
    const h = spaces.map((s) => hashString(s.id));
    return {
      h,
      rot: Float32Array.from(h.map((v) => Math.PI / 2 + ((v >>> 4) % 2) * Math.PI)),
      lambda: Float32Array.from(h.map((v) => 4 + (v % 5) * 0.4)),
    };
  }, [spaces]);

  const lineGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const attr = new THREE.BufferAttribute(new Float32Array(n * GHOST_VERTS * 3), 3);
    attr.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute("position", attr);
    g.setDrawRange(0, 0);
    return g;
  }, [n]);

  // Animated state (progress 0..1) and bookkeeping, kept outside React state.
  const state = useRef<{ p: Float32Array; c: Float32Array; g: Float32Array } | null>(null);
  const dirty = useRef(true);
  const latest = useRef(targets);
  latest.current = targets;

  function writeStall(i: number) {
    const s = spaces[i];
    const v = state.current!.p[i];
    const h = stat.h[i];
    if (v > 0.01) {
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(s.width - 0.1, Math.max(0.001, 0.28 * v), s.depth - 0.1);
      dummy.position.set(s.x, BASE_Y + 0.14 * v, s.z);
      dummy.updateMatrix();
      edgeRef.current!.setMatrixAt(i, dummy.matrix);
      dummy.scale.set(s.width - 0.55, Math.max(0.001, 0.2 * v), s.depth - 0.55);
      dummy.position.set(s.x, BASE_Y + 0.33 * v, s.z);
      dummy.updateMatrix();
      grassRef.current!.setMatrixAt(i, dummy.matrix);
    } else {
      edgeRef.current!.setMatrixAt(i, HIDDEN);
      grassRef.current!.setMatrixAt(i, HIDDEN);
    }
    if (v > 0.3) {
      dummy.scale.setScalar(Math.max(0.001, (v - 0.3) / 0.7));
      dummy.position.set(s.x + (h % 2 ? 0.35 : -0.35), BASE_Y + 0.45, s.z + ((h % 3) - 1));
      dummy.updateMatrix();
      bushRef.current!.setMatrixAt(i, dummy.matrix);
    } else {
      bushRef.current!.setMatrixAt(i, HIDDEN);
    }
  }

  function writeCar(i: number) {
    const s = spaces[i];
    const c = state.current!.c[i];
    if (c <= 0.02) {
      bodyRef.current!.setMatrixAt(i, HIDDEN);
      cabinRef.current!.setMatrixAt(i, HIDDEN);
      return;
    }
    const rot = stat.rot[i];
    const sin = Math.sin(rot);
    const cos = Math.cos(rot);
    dummy.rotation.set(0, rot, 0);
    dummy.scale.setScalar(c);
    dummy.position.set(s.x, BASE_Y + CAR_BODY_OFFSET[1] * c, s.z);
    dummy.updateMatrix();
    bodyRef.current!.setMatrixAt(i, dummy.matrix);
    const oz = CAR_CABIN_OFFSET[2] * c;
    dummy.position.set(s.x + oz * sin, BASE_Y + CAR_CABIN_OFFSET[1] * c, s.z + oz * cos);
    dummy.updateMatrix();
    cabinRef.current!.setMatrixAt(i, dummy.matrix);
  }

  function writeGhosts() {
    const g = state.current!.g;
    const pos = lineGeo.attributes.position.array as Float32Array;
    let count = 0;
    for (let i = 0; i < n; i++) {
      const gv = g[i];
      if (gv <= 0.02) {
        ghostRef.current!.setMatrixAt(i, HIDDEN);
        continue;
      }
      const s = spaces[i];
      const rot = stat.rot[i];
      const sin = Math.sin(rot);
      const cos = Math.cos(rot);
      const y0 = BASE_Y + 0.62;
      dummy.rotation.set(0, rot, 0);
      dummy.scale.setScalar(gv);
      dummy.position.set(s.x, y0 + GHOST_OFFSET_Y * gv, s.z);
      dummy.updateMatrix();
      ghostRef.current!.setMatrixAt(i, dummy.matrix);
      // Edges: world = origin + Ry(rot) * (gv * (v + (0, offsetY, 0)))
      let o = count * GHOST_VERTS * 3;
      for (let k = 0; k < GHOST_EDGE_VERTS.length; k += 3) {
        const vx = GHOST_EDGE_VERTS[k] * gv;
        const vy = (GHOST_EDGE_VERTS[k + 1] + GHOST_OFFSET_Y) * gv;
        const vz = GHOST_EDGE_VERTS[k + 2] * gv;
        pos[o++] = s.x + vx * cos + vz * sin;
        pos[o++] = y0 + vy;
        pos[o++] = s.z - vx * sin + vz * cos;
      }
      count++;
    }
    lineGeo.setDrawRange(0, count * GHOST_VERTS);
    lineGeo.attributes.position.needsUpdate = true;
  }

  // First layout: snap to the targets (no entrance animation) and set static per-instance colours.
  useLayoutEffect(() => {
    if (state.current) return;
    state.current = { p: targets.converted.slice(), c: targets.parked.slice(), g: targets.ghost.slice() };
    const col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      grassRef.current!.setColorAt(i, GRASS_TONES[stat.h[i] % 3]);
      bodyRef.current!.setColorAt(i, col.copy(CAR_TONES[spaces[i].carTone % CAR_TONES.length]));
      writeStall(i);
      writeCar(i);
    }
    writeGhosts();
    for (const m of [edgeRef, grassRef, bushRef, bodyRef, cabinRef, ghostRef]) {
      m.current!.instanceMatrix.needsUpdate = true;
    }
    grassRef.current!.instanceColor!.needsUpdate = true;
    bodyRef.current!.instanceColor!.needsUpdate = true;
    dirty.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // New targets from the simulation → wake the animation loop.
  useLayoutEffect(() => {
    dirty.current = true;
  }, [targets]);

  useFrame((_, dt) => {
    const st = state.current;
    if (!st || !dirty.current) return;
    const t = latest.current;
    const reduce = prefersReducedMotion();
    const d = Math.min(dt, 0.05);
    let stallMoved = false;
    let carMoved = false;
    let ghostMoved = false;
    for (let i = 0; i < n; i++) {
      const pt = t.converted[i];
      if (st.p[i] !== pt) {
        let v = reduce ? pt : THREE.MathUtils.damp(st.p[i], pt, stat.lambda[i], d);
        if (Math.abs(v - pt) < 0.002) v = pt;
        st.p[i] = v;
        writeStall(i);
        stallMoved = true;
      }
      const ct = t.parked[i];
      if (st.c[i] !== ct) {
        let v = reduce ? ct : THREE.MathUtils.damp(st.c[i], ct, 6, d);
        if (Math.abs(v - ct) < 0.002) v = ct;
        st.c[i] = v;
        writeCar(i);
        carMoved = true;
      }
      const gt = t.ghost[i];
      if (st.g[i] !== gt) {
        let v = reduce ? gt : THREE.MathUtils.damp(st.g[i], gt, 6, d);
        if (Math.abs(v - gt) < 0.002) v = gt;
        st.g[i] = v;
        ghostMoved = true;
      }
    }
    if (ghostMoved) writeGhosts();
    if (stallMoved) {
      edgeRef.current!.instanceMatrix.needsUpdate = true;
      grassRef.current!.instanceMatrix.needsUpdate = true;
      bushRef.current!.instanceMatrix.needsUpdate = true;
    }
    if (carMoved) {
      bodyRef.current!.instanceMatrix.needsUpdate = true;
      cabinRef.current!.instanceMatrix.needsUpdate = true;
    }
    if (ghostMoved) ghostRef.current!.instanceMatrix.needsUpdate = true;
    if (!stallMoved && !carMoved && !ghostMoved) dirty.current = false;
  });

  return (
    <group>
      <instancedMesh ref={edgeRef} args={[unitBox, edgeMat, n]} frustumCulled={false} receiveShadow />
      <instancedMesh ref={grassRef} args={[unitBox, grassMat, n]} frustumCulled={false} receiveShadow />
      <instancedMesh ref={bushRef} args={[bushGeo, bushMat, n]} frustumCulled={false} castShadow />
      <instancedMesh ref={bodyRef} args={[CAR_BODY_GEO, CAR_BODY_MAT, n]} frustumCulled={false} castShadow />
      <instancedMesh ref={cabinRef} args={[CAR_CABIN_GEO, CAR_GLASS_MAT, n]} frustumCulled={false} castShadow />
      <instancedMesh ref={ghostRef} args={[GHOST_BODY_GEO, GHOST_MAT, n]} frustumCulled={false} />
      <lineSegments ref={linesRef} geometry={lineGeo} material={GHOST_EDGE_MAT} frustumCulled={false} />
    </group>
  );
}
