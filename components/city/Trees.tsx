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
 * Existing street trees: two instanced meshes (trunks, crowns), written once. They are part of the
 * SHARED scene (identical in every view), so they live on layer 0.
 */
export function StreetTrees({ layout }: { layout: CityLayout }) {
  const street = layout.streetTrees;
  const ns = street.length;
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const crownRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    street.forEach((t, i) => {
      if (!STREET_TREES_AT_DESIGN_SIZE) {
        // Legacy look: unit-size trunk and crown centred on the tree's base point.
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(1);
        dummy.position.set(t.x, STREET_Y, t.z);
        dummy.updateMatrix();
        trunkRef.current!.setMatrixAt(i, dummy.matrix);
        crownRef.current!.setMatrixAt(i, dummy.matrix);
        return;
      }
      const R = MATURE_RADIUS * STREET_SIZE;
      const H = 1.2 + 1.6 * STREET_SIZE;
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, H, 1);
      dummy.position.set(t.x, STREET_Y + H / 2, t.z);
      dummy.updateMatrix();
      trunkRef.current!.setMatrixAt(i, dummy.matrix);
      dummy.scale.set(R, R * 0.9, R);
      dummy.position.set(t.x, STREET_Y + H + R * 0.55, t.z);
      dummy.updateMatrix();
      crownRef.current!.setMatrixAt(i, dummy.matrix);
    });
    trunkRef.current!.instanceMatrix.needsUpdate = true;
    crownRef.current!.instanceMatrix.needsUpdate = true;
  }, [street]);

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[trunkGeo, trunkMat, ns]} frustumCulled={false} castShadow />
      <instancedMesh ref={crownRef} args={[crownGeo, streetCrownMat, ns]} frustumCulled={false} castShadow />
    </group>
  );
}

/**
 * Newly planted trees: two instanced meshes (trunks, crowns). Every potential planted tree (the
 * 100% scenario) keeps its instance and grows in/out as the simulation's tree set changes, so
 * tree identity is stable (instance k ↔ simulated tree `tree-k`). These depend on the simulated
 * scenario, so `layerMask` lets Compare mode draw a baseline and a scenario copy on separate layers.
 */
export function PlantedTrees({
  potential,
  planted,
  stage,
  layerMask = 1,
}: {
  potential: PlantedTree[];
  /** 1 where simulated tree k exists (aligned to `potential`). */
  planted: Float32Array;
  stage: CanopyStage;
  /** three.js layer bitmask (1 = default layer). */
  layerMask?: number;
}) {
  const np = potential.length;
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const crownRef = useRef<THREE.InstancedMesh>(null);

  const pos = useMemo(() => {
    const x = new Float32Array(np);
    const z = new Float32Array(np);
    potential.forEach((t, k) => ((x[k] = t.x), (z[k] = t.z)));
    return { x, z };
  }, [potential, np]);

  const state = useRef<{ g: Float32Array; s: Float32Array } | null>(null);
  const dirty = useRef(true);

  const targets = useMemo(() => {
    const g = new Float32Array(np);
    const s = new Float32Array(np);
    for (let k = 0; k < np; k++) {
      g[k] = planted[k];
      s[k] = stage === "mature" ? 1 : 0.3;
    }
    return { g, s };
  }, [planted, stage, np]);
  const latest = useRef(targets);
  latest.current = targets;

  function write(i: number) {
    const st = state.current!;
    const gr = st.g[i];
    if (gr <= 0.01) {
      trunkRef.current!.setMatrixAt(i, HIDDEN);
      crownRef.current!.setMatrixAt(i, HIDDEN);
      return;
    }
    const sz = st.s[i];
    const R = MATURE_RADIUS * sz;
    const H = 1.2 + 1.6 * sz;
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(gr, Math.max(0.001, gr * H), gr);
    dummy.position.set(pos.x[i], PLANTED_Y + (gr * H) / 2, pos.z[i]);
    dummy.updateMatrix();
    trunkRef.current!.setMatrixAt(i, dummy.matrix);
    dummy.scale.set(gr * R, gr * R * 0.9, gr * R);
    dummy.position.set(pos.x[i], PLANTED_Y + gr * (H + R * 0.55), pos.z[i]);
    dummy.updateMatrix();
    crownRef.current!.setMatrixAt(i, dummy.matrix);
  }

  function flush() {
    trunkRef.current!.instanceMatrix.needsUpdate = true;
    crownRef.current!.instanceMatrix.needsUpdate = true;
  }

  useLayoutEffect(() => {
    if (state.current) return;
    state.current = { g: targets.g.slice(), s: targets.s.slice() };
    for (let i = 0; i < np; i++) write(i);
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
    for (let i = 0; i < np; i++) {
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
      <instancedMesh ref={trunkRef} args={[trunkGeo, trunkMat, np]} frustumCulled={false} castShadow layers-mask={layerMask} />
      <instancedMesh
        ref={crownRef}
        args={[crownGeo, stage === "mature" ? plantedCrownMat : saplingCrownMat, np]}
        frustumCulled={false}
        castShadow
        layers-mask={layerMask}
      />
    </group>
  );
}
