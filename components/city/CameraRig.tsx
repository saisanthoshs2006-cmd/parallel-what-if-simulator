"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ElementRef } from "react";
import type { OrbitControls } from "@react-three/drei";
import { prefersReducedMotion } from "@/lib/motion";
import type { CameraPreset } from "@/store/simulation-store";
import { framePreset } from "./cameraFraming";

/** Orbit controls instance type, derived from drei so we do not import a transitive dependency. */
type OrbitControlsImpl = ElementRef<typeof OrbitControls>;

const DURATION = 1.6;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Animates camera + orbit target to a preset whenever `nonce` changes. Presets are fitted to the
 * viewport aspect ratio. User input cancels the animation; until the user moves the camera,
 * the framing is also re-fitted when the viewport is resized.
 */
export function CameraRig({ preset, nonce }: { preset: CameraPreset; nonce: number }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const anim = useRef<{ t: number; fromP: THREE.Vector3; fromT: THREE.Vector3; toP: THREE.Vector3; toT: THREE.Vector3 } | null>(null);
  const first = useRef(true);
  const userMoved = useRef(false);

  useEffect(() => {
    if (!controls) return;
    const onStart = () => {
      anim.current = null;
      userMoved.current = true;
    };
    controls.addEventListener("start", onStart);
    return () => controls.removeEventListener("start", onStart);
  }, [controls]);

  // Latest aspect without re-triggering the preset animation.
  const aspectRef = useRef(aspect);
  aspectRef.current = aspect;

  useEffect(() => {
    if (!controls) return;
    const f = framePreset(preset, aspectRef.current, camera.fov);
    userMoved.current = false;
    if (first.current || prefersReducedMotion()) {
      first.current = false;
      camera.position.set(...f.position);
      controls.target.set(...f.target);
      controls.update();
      return;
    }
    anim.current = {
      t: 0,
      fromP: camera.position.clone(),
      fromT: controls.target.clone(),
      toP: new THREE.Vector3(...f.position),
      toT: new THREE.Vector3(...f.target),
    };
  }, [nonce, preset, camera, controls]);

  // Viewport resized (e.g. rotating a phone): refit unless the user has taken over the camera.
  useEffect(() => {
    if (!controls || first.current || userMoved.current || anim.current) return;
    const f = framePreset(preset, aspect, camera.fov);
    camera.position.set(...f.position);
    controls.target.set(...f.target);
    controls.update();
  }, [aspect, preset, camera, controls]);

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
