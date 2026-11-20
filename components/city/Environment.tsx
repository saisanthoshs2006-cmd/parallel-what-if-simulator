"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { CityLayout } from "@/lib/simulation/types";
import { COLORS } from "./palette";
import { buildBuildingsGeometry } from "./buildingsGeometry";
import { useFacadeTexture } from "./shared";

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

/** All buildings as one merged mesh (2 material groups) instead of a 6-group mesh per building. */
function Buildings({ buildings, tex }: { buildings: CityLayout["buildings"]; tex: THREE.Texture }) {
  const geo = useMemo(() => buildBuildingsGeometry(buildings), [buildings]);
  const side = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: tex,
        emissive: new THREE.Color("#ffffff"),
        emissiveIntensity: 0.1,
        vertexColors: true,
        roughness: 0.85,
      }),
    [tex],
  );
  const roof = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2c3238", roughness: 0.9 }), []);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={[side, roof]} castShadow receiveShadow />;
}

/** The 9 blocks: one instanced mesh for the sidewalk slabs and one per surface type for the tops. */
function Blocks({ blocks }: { blocks: CityLayout["blocks"] }) {
  const slabs = useRef<THREE.InstancedMesh>(null);
  const lotTops = useRef<THREE.InstancedMesh>(null);
  const otherTops = useRef<THREE.InstancedMesh>(null);
  const lots = blocks.filter((b) => b.kind === "lot");
  const others = blocks.filter((b) => b.kind !== "lot");
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    const put = (m: THREE.InstancedMesh | null, list: CityLayout["blocks"], y: number, h: number, shrink: number) => {
      if (!m) return;
      list.forEach((b, i) => {
        o.position.set(b.cx, y, b.cz);
        o.scale.set(b.size - shrink, h, b.size - shrink);
        o.updateMatrix();
        m.setMatrixAt(i, o.matrix);
      });
      m.instanceMatrix.needsUpdate = true;
    };
    put(slabs.current, blocks, 0.125, 0.25, 0);
    put(lotTops.current, lots, 0.26, 0.04, 6);
    put(otherTops.current, others, 0.26, 0.04, 6);
  }, [blocks, lots, others]);
  return (
    <group>
      <instancedMesh ref={slabs} args={[undefined, undefined, blocks.length]} frustumCulled={false} receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={COLORS.sidewalk} roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={lotTops} args={[undefined, undefined, lots.length]} frustumCulled={false} receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={COLORS.asphalt} roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={otherTops} args={[undefined, undefined, others.length]} frustumCulled={false} receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={COLORS.blockGround} roughness={0.95} />
      </instancedMesh>
    </group>
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

      <Blocks blocks={layout.blocks} />

      {layout.pocketParks.map((p) => (
        <mesh key={p.id} position={[p.x, 0.36, p.z]} receiveShadow>
          <boxGeometry args={[p.w, 0.16, p.d]} />
          <meshStandardMaterial color={COLORS.park} roughness={1} />
        </mesh>
      ))}

      <Buildings buildings={layout.buildings} tex={tex} />
    </group>
  );
}
