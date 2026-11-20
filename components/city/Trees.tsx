"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CityLayout, PlantedTree } from "@/lib/simulation/types";
import { ASSUMPTIONS } from "@/lib/config/assumptions";
import { COLORS } from "./palette";
import type { CanopyStage } from "@/lib/simulation/scenario-url";

/** Crown radius whose projected area equals the assumed mature canopy. */
const MATURE_RADIUS = Math.sqrt(ASSUMPTIONS.matureCanopyPerTreeM2 / Math.PI);
const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 1, 6);
const crownGeo = new THREE.IcosahedronGeometry(1, 1);
const trunkMat = new THREE.MeshStandardMaterial({ color: COLORS.trunk, roughness: 1 });
const crownMat = new THREE.MeshStandardMaterial({ color: COLORS.leaf, roughness: 0.9, flatShading: true });
const crownSaplingMat = new THREE.MeshStandardMaterial({
  color: COLORS.leafSapling,
  roughness: 0.9,
  flatShading: true,
});

interface TreeProps {
  x: number;
  z: number;
  /** Whether the tree exists in the current simulation state. */
  present: boolean;
  /** 0..1 crown size relative to maturity. */
  size: number;
  y?: number;
  sapling?: boolean;
}

function Tree({ x, z, present, size, y = 0.26, sapling }: TreeProps) {
  const root = useRef<THREE.Group>(null);
  const trunk = useRef<THREE.Mesh>(null);
  const crown = useRef<THREE.Mesh>(null);
  const g = useRef(present ? 1 : 0);
  const s = useRef(size);

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    const gt = present ? 1 : 0;
    if (g.current === gt && s.current === size) return;
    g.current = THREE.MathUtils.damp(g.current, gt, 5, d);
    s.current = THREE.MathUtils.damp(s.current, size, 3, d);
    if (Math.abs(g.current - gt) < 0.003) g.current = gt;
    if (Math.abs(s.current - size) < 0.003) s.current = size;
    const grow = g.current;
    const R = MATURE_RADIUS * s.current;
    const H = 1.2 + 1.6 * s.current;
    if (root.current) {
      root.current.visible = grow > 0.01;
      root.current.scale.setScalar(Math.max(0.001, grow));
    }
    if (trunk.current) {
      trunk.current.scale.set(1, H, 1);
      trunk.current.position.y = H / 2;
    }
    if (crown.current) {
      crown.current.scale.set(R, R * 0.9, R);
      crown.current.position.y = H + R * 0.55;
    }
  });

  return (
    <group ref={root} position={[x, y, z]} visible={present}>
      <mesh ref={trunk} geometry={trunkGeo} material={trunkMat} castShadow />
      <mesh ref={crown} geometry={crownGeo} material={sapling ? crownSaplingMat : crownMat} castShadow />
    </group>
  );
}

export function StreetTrees({ layout }: { layout: CityLayout }) {
  return (
    <group>
      {layout.streetTrees.map((t) => (
        <Tree key={t.id} x={t.x} z={t.z} present size={0.85} />
      ))}
    </group>
  );
}

/**
 * Planted trees. Every potential tree (100% scenario) stays mounted; `activeIds`
 * from the simulation decides which exist, so trees grow in/out without remounting.
 */
export function PlantedTrees({
  potential,
  activeIds,
  stage,
}: {
  potential: PlantedTree[];
  activeIds: ReadonlySet<string>;
  stage: CanopyStage;
}) {
  return (
    <group>
      {potential.map((t) => (
        <Tree
          key={t.id}
          x={t.x}
          z={t.z}
          y={0.55}
          present={activeIds.has(t.id)}
          size={stage === "mature" ? 1 : 0.3}
          sapling={stage === "sapling"}
        />
      ))}
    </group>
  );
}
