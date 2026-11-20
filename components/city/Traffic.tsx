"use client";

import { useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CityLayout } from "@/lib/simulation/types";
import { prefersReducedMotion } from "@/lib/motion";
import {
  CAR_BODY_GEO,
  CAR_BODY_MAT,
  CAR_BODY_OFFSET,
  CAR_CABIN_GEO,
  CAR_CABIN_OFFSET,
  CAR_GLASS_MAT,
  CAR_TONES,
} from "./shared";

const HALF = 105;
const dummy = new THREE.Object3D();

/**
 * Decorative background traffic (not a traffic model) as two instanced meshes.
 * With reduced motion the vehicles hold still at their starting positions.
 */
export function Traffic({ layout }: { layout: CityLayout }) {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const cabinRef = useRef<THREE.InstancedMesh>(null);
  const v = layout.traffic;
  const n = v.length;
  const wasStatic = useRef(false);

  useLayoutEffect(() => {
    const col = new THREE.Color();
    v.forEach((veh, i) => bodyRef.current!.setColorAt(i, col.copy(CAR_TONES[veh.tone % CAR_TONES.length])));
    bodyRef.current!.instanceColor!.needsUpdate = true;
  }, [v]);

  useFrame(({ clock }) => {
    const reduce = prefersReducedMotion();
    if (reduce && wasStatic.current) return;
    wasStatic.current = reduce;
    const time = reduce ? 0 : clock.elapsedTime;
    const span = HALF * 2;
    for (let i = 0; i < n; i++) {
      const veh = v[i];
      const raw = (veh.phase * span + time * veh.speed * veh.direction) % span;
      const along = (raw < 0 ? raw + span : raw) - HALF;
      const rot = veh.axis === "x" ? (Math.PI / 2) * veh.direction : veh.direction > 0 ? 0 : Math.PI;
      const x = veh.axis === "x" ? along : veh.line + veh.lane;
      const z = veh.axis === "x" ? veh.line + veh.lane : along;
      const sin = Math.sin(rot);
      const cos = Math.cos(rot);
      dummy.rotation.set(0, rot, 0);
      dummy.scale.setScalar(1);
      dummy.position.set(x, 0.1 + CAR_BODY_OFFSET[1], z);
      dummy.updateMatrix();
      bodyRef.current!.setMatrixAt(i, dummy.matrix);
      const oz = CAR_CABIN_OFFSET[2];
      dummy.position.set(x + oz * sin, 0.1 + CAR_CABIN_OFFSET[1], z + oz * cos);
      dummy.updateMatrix();
      cabinRef.current!.setMatrixAt(i, dummy.matrix);
    }
    bodyRef.current!.instanceMatrix.needsUpdate = true;
    cabinRef.current!.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={bodyRef} args={[CAR_BODY_GEO, CAR_BODY_MAT, n]} frustumCulled={false} castShadow />
      <instancedMesh ref={cabinRef} args={[CAR_CABIN_GEO, CAR_GLASS_MAT, n]} frustumCulled={false} castShadow />
    </group>
  );
}
