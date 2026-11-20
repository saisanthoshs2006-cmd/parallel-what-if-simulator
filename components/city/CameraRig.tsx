"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { CameraPreset } from "@/store/simulation-store";

export const CAMERA_PRESETS: Record<CameraPreset, { position: [number, number, number]; target: [number, number, number] }> = {
  overview: { position: [118, 150, 138], target: [0, 0, 0] },
  focus: { position: [-70, 85, -125], target: [-14, 0, -24] },
};

const DURATION = 1.6;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Animates camera + orbit target to a preset whenever `nonce` changes. User input cancels it. */
export function CameraRig({ preset, nonce }: { preset: CameraPreset; nonce: number }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const anim = useRef<{ t: number; fromP: THREE.Vector3; fromT: THREE.Vector3; toP: THREE.Vector3; toT: THREE.Vector3 } | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (!controls) return;
    const cancel = () => {
      anim.current = null;
    };
    controls.addEventListener("start", cancel);
    return () => controls.removeEventListener("start", cancel);
  }, [controls]);

  useEffect(() => {
    if (!controls) return;
    const p = CAMERA_PRESETS[preset];
    if (first.current) {
      first.current = false;
      camera.position.set(...p.position);
      controls.target.set(...p.target);
      controls.update();
      return;
    }
    anim.current = {
      t: 0,
      fromP: camera.position.clone(),
      fromT: controls.target.clone(),
      toP: new THREE.Vector3(...p.position),
      toT: new THREE.Vector3(...p.target),
    };
  }, [nonce, preset, camera, controls]);

  useFrame((_, dt) => {
    const a = anim.current;
    if (!a || !controls) return;
    a.t = Math.min(1, a.t + dt / DURATION);
    const k = easeInOut(a.t);
    camera.position.lerpVectors(a.fromP, a.toP, k);
    controls.target.lerpVectors(a.fromT, a.toT, k);
    controls.update();
    if (a.t >= 1) anim.current = null;
  });

  return null;
}
