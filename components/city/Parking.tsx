"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { CityLayout } from "@/lib/simulation/types";
import { COLORS } from "./palette";
import { ParkingInstances } from "./ParkingInstances";
import type { StallTargets } from "./instanceTargets";

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
  // Free the GPU texture of the previous label text.
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite position={[x, 9, z]} scale={[3.4 * aspect, 3.4, 1]}>
      <spriteMaterial map={texture} depthWrite={false} toneMapped={false} />
    </sprite>
  );
}

export function ParkingLots({ layout, targets }: { layout: CityLayout; targets: StallTargets }) {
  const lots = useMemo(() => {
    const out: Array<{ block: CityLayout["blocks"][number]; total: number; converted: number }> = [];
    for (const block of layout.blocks.filter((b) => b.kind === "lot")) {
      let total = 0;
      let converted = 0;
      layout.spaces.forEach((s, i) => {
        if (s.lotId !== block.id) return;
        total++;
        converted += targets.converted[i];
      });
      out.push({ block, total, converted });
    }
    return out;
  }, [layout, targets]);
  return (
    <group>
      <StallLines layout={layout} />
      <ParkingInstances layout={layout} targets={targets} />
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
