"use client";

import { useMemo } from "react";
import { OrbitControls } from "@react-three/drei";
import { CITY } from "@/lib/simulation/layout";
import { simulate } from "@/lib/simulation/engine";
import type { SimulationResult } from "@/lib/simulation/types";
import type { CanopyStage } from "@/lib/simulation/scenario-url";
import type { CameraPreset, SimulationStoreApi } from "@/store/simulation-store";
import { CameraRig } from "./CameraRig";
import { Environment } from "./Environment";
import { ParkingDependents, StallLines } from "./Parking";
import { PlantedTrees, StreetTrees } from "./Trees";
import { Traffic } from "./Traffic";
import { buildStallTargets, buildTreeTargets } from "./instanceTargets";
import { CompareRenderer } from "./CompareRenderer";
import { dependentMask } from "./compareRegions";
import { COLORS } from "./palette";

interface SceneProps {
  /** The simulation state being displayed (baseline or scenario; the scenario while comparing). */
  sim: SimulationResult;
  /** Baseline state, drawn on the left of the divider while comparing. */
  baselineSim: SimulationResult;
  /** Compare mode: draw baseline (left) and scenario (right) in two scissored passes. */
  compare: boolean;
  /** Store handle (React context does not cross into the R3F canvas) for the live divider position. */
  store: SimulationStoreApi;
  stage: CanopyStage;
  camera: { preset: CameraPreset; nonce: number };
}

export function Scene({ sim, baselineSim, compare, store, stage, camera }: SceneProps) {
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
  // Baseline copy of the scenario-dependent parts; only mounted while comparing.
  const baselineStallTargets = useMemo(() => buildStallTargets(CITY, baselineSim), [baselineSim]);
  const baselineTreeTargets = useMemo(
    () =>
      buildTreeTargets(
        potentialTrees.map((t) => t.id),
        new Set(baselineSim.trees.map((t) => t.id)),
      ),
    [potentialTrees, baselineSim.trees],
  );
  // Outside Compare everything is on the default layer, exactly as before.
  const scenarioMask = compare ? dependentMask("scenario") : 1;

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
      <StallLines layout={CITY} />
      <StreetTrees layout={CITY} />
      <ParkingDependents layout={CITY} targets={stallTargets} layerMask={scenarioMask} />
      <PlantedTrees potential={potentialTrees} planted={treeTargets} stage={stage} layerMask={scenarioMask} />
      {compare && (
        <>
          <ParkingDependents layout={CITY} targets={baselineStallTargets} layerMask={dependentMask("baseline")} />
          <PlantedTrees
            potential={potentialTrees}
            planted={baselineTreeTargets}
            stage={stage}
            layerMask={dependentMask("baseline")}
          />
          <CompareRenderer store={store} />
        </>
      )}
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
