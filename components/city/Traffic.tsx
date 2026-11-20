"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import type { CityLayout, TrafficVehicle } from "@/lib/simulation/types";
import { Car } from "./shared";

const HALF = 105;

function Vehicle({ v }: { v: TrafficVehicle }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const span = HALF * 2;
    const raw = (v.phase * span + clock.elapsedTime * v.speed * v.direction) % span;
    const along = (raw < 0 ? raw + span : raw) - HALF;
    if (v.axis === "x") {
      g.position.set(along, 0.1, v.line + v.lane);
      g.rotation.y = (Math.PI / 2) * v.direction;
    } else {
      g.position.set(v.line + v.lane, 0.1, along);
      g.rotation.y = v.direction > 0 ? 0 : Math.PI;
    }
  });
  return (
    <group ref={ref}>
      <Car tone={v.tone} />
    </group>
  );
}

export function Traffic({ layout }: { layout: CityLayout }) {
  return (
    <group>
      {layout.traffic.map((v) => (
        <Vehicle key={v.id} v={v} />
      ))}
    </group>
  );
}
