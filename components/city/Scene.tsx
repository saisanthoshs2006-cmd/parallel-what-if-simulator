"use client";

import { useMemo } from "react";
import { OrbitControls } from "@react-three/drei";
import { CITY } from "@/lib/simulation/layout";
import { simulate } from "@/lib/simulation/engine";
import type { SimulationResult } from "@/lib/simulation/types";
import type { CanopyStage } from "@/lib/simulation/scenario-url";
import type { CameraPreset } from "@/store/simulation-store";
import { CameraRig } from "./CameraRig";
import { Environment } from "./Environment";
import { ParkingLots } from "./Parking";
import { Trees } from "./Trees";
import { Traffic } from "./Traffic";
import { buildStallTargets, buildTreeTargets } from "./instanceTargets";
import { COLORS } from "./palette";

interface SceneProps {
  /** The simulation state being displayed (baseline or scenario). */
  sim: SimulationResult;
  stage: CanopyStage;
  camera: { preset: CameraPreset; nonce: number };
}

export function Scene({ sim, stage, camera }: SceneProps) {
  const stallTargets = useMemo(() => buildStallTargets(CITY, sim), [sim]);
  const potentialTrees = useMemo(() => simulate(100).trees, []);
  const treeTargets = useMemo(
    () =>
      buildTreeTargets(
        potentialTrees.map((t) => t.id),
        new Set(sim.trees.map((t) => t.id)),
      ),
    [potentialTrees, sim.trees],
  );

  return (
    <>
      <color attach="background" args={[COLORS.background]} />
      <fog attach="fog" args={[COLORS.background, 320, 640]} />
      <hemisphereLight args={["#9bb4cf", "#1a1f24", 1.1]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[70, 110, 45]}
        intensity={2.4}
        color="#ffe3b8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-110}
        shadow-camera-right={110}
        shadow-camera-top={110}
        shadow-camera-bottom={-110}
        shadow-camera-near={10}
        shadow-camera-far={320}
        shadow-bias={-0.0004}
      />
      <Environment layout={CITY} />
      <ParkingLots layout={CITY} targets={stallTargets} />
      <Trees layout={CITY} potential={potentialTrees} planted={treeTargets} stage={stage} />
      <Traffic layout={CITY} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={25}
        maxDistance={520}
        maxPolarAngle={Math.PI / 2.15}
        zoomSpeed={0.7}
      />
      <CameraRig preset={camera.preset} nonce={camera.nonce} />
    </>
  );
}
