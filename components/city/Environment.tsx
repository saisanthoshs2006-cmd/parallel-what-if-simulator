"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { CityLayout } from "@/lib/simulation/types";
import { COLORS } from "./palette";
import { facadeGeometry, useFacadeTexture } from "./shared";

const ROAD_LEN = 260;

function Dashes({ layout }: { layout: CityLayout }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const items = useMemo(() => {
    const out: Array<[number, number, number]> = [];
    for (const r of layout.roads) {
      const other = layout.roads.filter((o) => o.axis !== r.axis).map((o) => o.pos);
      for (let t = -ROAD_LEN / 2 + 3; t < ROAD_LEN / 2; t += 7) {
        if (other.some((o) => Math.abs(t - o) < 8)) continue;
        out.push(r.axis === "x" ? [t, r.pos, 0] : [r.pos, t, 1]);
      }
    }
    return out;
  }, [layout]);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    items.forEach(([a, b, rot], i) => {
      o.position.set(a, 0.13, b);
      o.rotation.set(0, rot ? Math.PI / 2 : 0, 0);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]}>
      <boxGeometry args={[3.2, 0.02, 0.25]} />
      <meshStandardMaterial color={COLORS.roadLine} roughness={0.9} />
    </instancedMesh>
  );
}

function Building({ b, tex }: { b: CityLayout["buildings"][number]; tex: THREE.Texture }) {
  const geo = useMemo(() => facadeGeometry(b.w, b.h, b.d), [b]);
  const side = useMemo(() => {
    const t = tex.clone();
    t.needsUpdate = true;
    return new THREE.MeshStandardMaterial({
      map: t,
      emissiveMap: t,
      emissive: new THREE.Color("#ffffff"),
      emissiveIntensity: 0.35,
      color: new THREE.Color().setHSL(0.58 + b.tone * 0.05, 0.1, 0.62 + b.tone * 0.2),
      roughness: 0.85,
    });
  }, [b, tex]);
  const roof = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3b424a", roughness: 0.9 }), []);
  return (
    <mesh
      geometry={geo}
      material={[side, side, roof, roof, side, side]}
      position={[b.x, 0.25 + b.h / 2, b.z]}
      castShadow
      receiveShadow
    />
  );
}

export function Environment({ layout }: { layout: CityLayout }) {
  const tex = useFacadeTexture();
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color={COLORS.ground} roughness={1} />
      </mesh>

      {layout.roads.map((r) => (
        <mesh
          key={r.id}
          position={r.axis === "x" ? [0, 0.05, r.pos] : [r.pos, 0.05, 0]}
          receiveShadow
        >
          <boxGeometry args={r.axis === "x" ? [ROAD_LEN, 0.1, r.width] : [r.width, 0.1, ROAD_LEN]} />
          <meshStandardMaterial color={COLORS.road} roughness={0.95} />
        </mesh>
      ))}
      <Dashes layout={layout} />

      {layout.blocks.map((b) => (
        <group key={b.id} position={[b.cx, 0, b.cz]}>
          <mesh position={[0, 0.125, 0]} receiveShadow>
            <boxGeometry args={[b.size, 0.25, b.size]} />
            <meshStandardMaterial color={COLORS.sidewalk} roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.26, 0]} receiveShadow>
            <boxGeometry args={[b.size - 6, 0.04, b.size - 6]} />
            <meshStandardMaterial
              color={b.kind === "lot" ? COLORS.asphalt : COLORS.blockGround}
              roughness={0.95}
            />
          </mesh>
        </group>
      ))}

      {layout.pocketParks.map((p) => (
        <mesh key={p.id} position={[p.x, 0.36, p.z]} receiveShadow>
          <boxGeometry args={[p.w, 0.16, p.d]} />
          <meshStandardMaterial color={COLORS.park} roughness={1} />
        </mesh>
      ))}

      {layout.buildings.map((b) => (
        <Building key={b.id} b={b} tex={tex} />
      ))}
    </group>
  );
}
