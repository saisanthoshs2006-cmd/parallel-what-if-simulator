"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CityLayout, ParkingSpace } from "@/lib/simulation/types";
import { hashString } from "@/lib/simulation/prng";
import { COLORS } from "./palette";
import { Car } from "./shared";

const edgeGeo = new THREE.BoxGeometry(1, 1, 1);
const edgeMat = new THREE.MeshStandardMaterial({ color: COLORS.curb, roughness: 0.9 });
const bushGeo = new THREE.IcosahedronGeometry(0.55, 1);
const bushMat = new THREE.MeshStandardMaterial({ color: COLORS.bush, roughness: 1, flatShading: true });
const grassMats = [COLORS.grassA, COLORS.grassB, COLORS.grassC].map(
  (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1 }),
);

const BASE_Y = 0.28;

/** One stall. Its visual state is driven entirely by `converted` (from the simulation). */
function Stall({ space, converted }: { space: ParkingSpace; converted: boolean }) {
  const edge = useRef<THREE.Mesh>(null);
  const grass = useRef<THREE.Mesh>(null);
  const bush = useRef<THREE.Mesh>(null);
  const car = useRef<THREE.Group>(null);
  const p = useRef(0);
  const h = useMemo(() => hashString(space.id), [space.id]);
  const lambda = 4 + (h % 5) * 0.4;

  useFrame((_, dt) => {
    const target = converted ? 1 : 0;
    if (Math.abs(p.current - target) < 0.001 && p.current === target) return;
    p.current = THREE.MathUtils.damp(p.current, target, lambda, Math.min(dt, 0.05));
    if (Math.abs(p.current - target) < 0.002) p.current = target;
    const v = p.current;
    if (edge.current) {
      edge.current.visible = v > 0.01;
      edge.current.scale.set(space.width - 0.1, Math.max(0.001, 0.28 * v), space.depth - 0.1);
      edge.current.position.y = BASE_Y + 0.14 * v;
    }
    if (grass.current) {
      grass.current.visible = v > 0.01;
      grass.current.scale.set(space.width - 0.55, Math.max(0.001, 0.2 * v), space.depth - 0.55);
      grass.current.position.y = BASE_Y + 0.28 * v + 0.05 * v;
    }
    if (bush.current) {
      bush.current.visible = v > 0.3;
      bush.current.scale.setScalar(Math.max(0.001, (v - 0.3) / 0.7));
      bush.current.position.y = BASE_Y + 0.45;
    }
    if (car.current) {
      const s = 1 - Math.min(1, v * 2.5);
      car.current.visible = s > 0.02;
      car.current.scale.set(s, s, s);
    }
  });

  return (
    <group position={[space.x, 0, space.z]}>
      <mesh ref={edge} geometry={edgeGeo} material={edgeMat} visible={false} receiveShadow />
      <mesh ref={grass} geometry={edgeGeo} material={grassMats[h % 3]} visible={false} receiveShadow />
      <mesh
        ref={bush}
        geometry={bushGeo}
        material={bushMat}
        visible={false}
        position={[(h % 2 ? 0.35 : -0.35), BASE_Y, (h % 3) - 1]}
        castShadow
      />
      {space.occupied && (
        <group ref={car} position={[0, BASE_Y, 0]} rotation-y={Math.PI / 2 + ((h >>> 4) % 2) * Math.PI}>
          <Car tone={space.carTone} />
        </group>
      )}
    </group>
  );
}

/** Painted stall dividers (static; hidden under the planted patches as they rise). */
function StallLines({ layout }: { layout: CityLayout }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const items = useMemo(
    () =>
      layout.spaces.flatMap((s) => [
        [s.x - s.width / 2, s.z],
        ...(s.col === 11 ? [[s.x + s.width / 2, s.z]] : []),
      ]),
    [layout],
  );
  const setRef = (m: THREE.InstancedMesh | null) => {
    ref.current = m;
    if (!m) return;
    const o = new THREE.Object3D();
    items.forEach(([x, z], i) => {
      o.position.set(x, 0.3, z);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  };
  return (
    <instancedMesh ref={setRef} args={[undefined, undefined, items.length]}>
      <boxGeometry args={[0.1, 0.02, 4.6]} />
      <meshStandardMaterial color={COLORS.stallLine} roughness={0.9} />
    </instancedMesh>
  );
}

/** Billboard label drawn to a canvas texture (no DOM portals inside the Canvas). */
function LotLabel({ x, z, text }: { x: number; z: number; text: string }) {
  const { texture, aspect } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 96;
    const g = c.getContext("2d")!;
    g.fillStyle = "rgba(13,18,23,0.88)";
    g.beginPath();
    g.roundRect(2, 2, 508, 92, 14);
    g.fill();
    g.strokeStyle = "rgba(255,255,255,0.14)";
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = "#d3dbe4";
    g.font = "600 38px ui-monospace, Menlo, monospace";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 256, 50);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return { texture: t, aspect: 512 / 96 };
  }, [text]);
  return (
    <sprite position={[x, 9, z]} scale={[3.4 * aspect, 3.4, 1]}>
      <spriteMaterial map={texture} depthWrite={false} toneMapped={false} />
    </sprite>
  );
}

export function ParkingLots({
  layout,
  convertedIds,
}: {
  layout: CityLayout;
  convertedIds: ReadonlySet<string>;
}) {
  const lots = useMemo(
    () =>
      layout.blocks
        .filter((b) => b.kind === "lot")
        .map((b) => {
          const mine = layout.spaces.filter((s) => s.lotId === b.id);
          return { block: b, total: mine.length, converted: mine.filter((s) => convertedIds.has(s.id)).length };
        }),
    [layout, convertedIds],
  );
  return (
    <group>
      <StallLines layout={layout} />
      {layout.spaces.map((s) => (
        <Stall key={s.id} space={s} converted={convertedIds.has(s.id)} />
      ))}
      {lots.map(({ block, total, converted }) => (
        <LotLabel
          key={block.id}
          x={block.cx}
          z={block.cz}
          text={`LOT ${block.id.replace("lot-", "")} · ${total - converted}/${total} parking`}
        />
      ))}
    </group>
  );
}
