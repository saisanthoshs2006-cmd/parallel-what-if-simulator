"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CityLayout, PlantedTree } from "@/lib/simulation/types";
import type { CanopyStage } from "@/lib/simulation/scenario-url";
import { ASSUMPTIONS } from "@/lib/config/assumptions";
import { prefersReducedMotion } from "@/lib/motion";
import { COLORS } from "./palette";

/** Crown radius whose projected area equals the assumed mature canopy. */
const MATURE_RADIUS = Math.sqrt(ASSUMPTIONS.matureCanopyPerTreeM2 / Math.PI);
const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 1, 6);
const crownGeo = new THREE.IcosahedronGeometry(1, 1);
const trunkMat = new THREE.MeshStandardMaterial({ color: COLORS.trunk, roughness: 1 });
/** Existing street trees: muted. Newly planted trees: brighter, slightly emissive. */
const streetCrownMat = new THREE.MeshStandardMaterial({ color: COLORS.streetLeaf, roughness: 0.95, flatShading: true });
const plantedCrownMat = new THREE.MeshStandardMaterial({
  color: COLORS.leaf,
  emissive: "#1f6a3c",
  emissiveIntensity: 0.35,
  roughness: 0.9,
  flatShading: true,
});
const saplingCrownMat = new THREE.MeshStandardMaterial({
  color: COLORS.leafSapling,
  emissive: "#2a7a48",
  emissiveIntensity: 0.35,
  roughness: 0.9,
  flatShading: true,
});

const STREET_SIZE = 0.85;
/**
 * LEGACY LOOK, kept deliberately. Before instancing, existing street trees never received their
 * intended transform (their per-tree component returned early on the first frame), so they have
 * always rendered as ~1 m dots at ground level rather than the design size (crown radius ≈ 2.1 m,
 * height ≈ 2.6 m, see `write`). This milestone must not change the product's appearance, so that
 * look is preserved. Set to true to render street trees at their design size; note the 20 m²
 * canopy per street tree in the metrics assumes the design size.
 */
const STREET_TREES_AT_DESIGN_SIZE = false;
const STREET_Y = 0.26;
const PLANTED_Y = 0.55;
const dummy = new THREE.Object3D();
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

/**
 * All trees as three instanced meshes (trunks, street crowns, planted crowns) instead of two
 * meshes per tree. Existing street trees are always present; every potential planted tree
 * (the 100% scenario) keeps its instance and grows in/out as the simulation's tree set changes,
 * so tree identity is stable (instance k ↔ simulated tree `tree-k`).
 */
export function Trees({
  layout,
  potential,
  planted,
  stage,
}: {
  layout: CityLayout;
  potential: PlantedTree[];
  /** 1 where simulated tree k exists (aligned to `potential`). */
  planted: Float32Array;
  stage: CanopyStage;
}) {
  const street = layout.streetTrees;
  const ns = street.length;
  const np = potential.length;
  const nt = ns + np;

  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const streetRef = useRef<THREE.InstancedMesh>(null);
  const plantedRef = useRef<THREE.InstancedMesh>(null);

  // Combined per-tree arrays: [street trees..., planted trees...]
  const pos = useMemo(() => {
    const x = new Float32Array(nt);
    const z = new Float32Array(nt);
    const y = new Float32Array(nt);
    street.forEach((t, i) => ((x[i] = t.x), (z[i] = t.z), (y[i] = STREET_Y)));
    potential.forEach((t, k) => ((x[ns + k] = t.x), (z[ns + k] = t.z), (y[ns + k] = PLANTED_Y)));
    return { x, z, y };
  }, [street, potential, ns, nt]);

  const state = useRef<{ g: Float32Array; s: Float32Array } | null>(null);
  const dirty = useRef(true);

  const targets = useMemo(() => {
    const g = new Float32Array(nt);
    const s = new Float32Array(nt);
    for (let i = 0; i < ns; i++) {
      g[i] = 1;
      s[i] = STREET_SIZE;
    }
    for (let k = 0; k < np; k++) {
      g[ns + k] = planted[k];
      s[ns + k] = stage === "mature" ? 1 : 0.3;
    }
    return { g, s };
  }, [planted, stage, ns, np, nt]);
  const latest = useRef(targets);
  latest.current = targets;

  function write(i: number) {
    const st = state.current!;
    const gr = st.g[i];
    if (gr <= 0.01) {
      trunkRef.current!.setMatrixAt(i, HIDDEN);
      (i < ns ? streetRef : plantedRef).current!.setMatrixAt(i < ns ? i : i - ns, HIDDEN);
      return;
    }
    if (i < ns && !STREET_TREES_AT_DESIGN_SIZE) {
      // Legacy look: unit-size trunk and crown centred on the tree's base point.
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1);
      dummy.position.set(pos.x[i], pos.y[i], pos.z[i]);
      dummy.updateMatrix();
      trunkRef.current!.setMatrixAt(i, dummy.matrix);
      streetRef.current!.setMatrixAt(i, dummy.matrix);
      return;
    }
    const sz = st.s[i];
    const R = MATURE_RADIUS * sz;
    const H = 1.2 + 1.6 * sz;
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(gr, Math.max(0.001, gr * H), gr);
    dummy.position.set(pos.x[i], pos.y[i] + (gr * H) / 2, pos.z[i]);
    dummy.updateMatrix();
    trunkRef.current!.setMatrixAt(i, dummy.matrix);
    dummy.scale.set(gr * R, gr * R * 0.9, gr * R);
    dummy.position.set(pos.x[i], pos.y[i] + gr * (H + R * 0.55), pos.z[i]);
    dummy.updateMatrix();
    (i < ns ? streetRef : plantedRef).current!.setMatrixAt(i < ns ? i : i - ns, dummy.matrix);
  }

  function flush() {
    trunkRef.current!.instanceMatrix.needsUpdate = true;
    streetRef.current!.instanceMatrix.needsUpdate = true;
    plantedRef.current!.instanceMatrix.needsUpdate = true;
  }

  useLayoutEffect(() => {
    if (state.current) return;
    state.current = { g: targets.g.slice(), s: targets.s.slice() };
    for (let i = 0; i < nt; i++) write(i);
    flush();
    dirty.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    dirty.current = true;
  }, [targets]);

  useFrame((_, dt) => {
    const st = state.current;
    if (!st || !dirty.current) return;
    const t = latest.current;
    const reduce = prefersReducedMotion();
    const d = Math.min(dt, 0.05);
    let moved = false;
    for (let i = 0; i < nt; i++) {
      if (st.g[i] === t.g[i] && st.s[i] === t.s[i]) continue;
      let g = reduce ? t.g[i] : THREE.MathUtils.damp(st.g[i], t.g[i], 5, d);
      let s = reduce ? t.s[i] : THREE.MathUtils.damp(st.s[i], t.s[i], 3, d);
      if (Math.abs(g - t.g[i]) < 0.003) g = t.g[i];
      if (Math.abs(s - t.s[i]) < 0.003) s = t.s[i];
      st.g[i] = g;
      st.s[i] = s;
      write(i);
      moved = true;
    }
    if (moved) flush();
    else dirty.current = false;
  });

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[trunkGeo, trunkMat, nt]} frustumCulled={false} castShadow />
      <instancedMesh ref={streetRef} args={[crownGeo, streetCrownMat, ns]} frustumCulled={false} castShadow />
      <instancedMesh
        ref={plantedRef}
        args={[crownGeo, stage === "mature" ? plantedCrownMat : saplingCrownMat, np]}
        frustumCulled={false}
        castShadow
      />
    </group>
  );
}
