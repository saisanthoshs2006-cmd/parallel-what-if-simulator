"use client";

import { Component, Suspense, useEffect, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { AlertTriangle } from "lucide-react";
import type { SimulationResult } from "@/lib/simulation/types";
import type { CanopyStage } from "@/lib/simulation/scenario-url";
import type { CameraPreset } from "@/store/simulation-store";
import { Scene } from "./Scene";
import { framePreset } from "./cameraFraming";

const INITIAL_CAMERA = framePreset("overview", 1.6, 36).position;

function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function Fallback({ message }: { message: string }) {
  return (
    <div role="alert" className="flex h-full w-full items-center justify-center bg-[#0a0e13] p-8">
      <div className="max-w-sm text-center">
        <AlertTriangle className="mx-auto mb-3 h-6 w-6 text-amber-400" aria-hidden />
        <h2 className="text-sm font-medium text-white">3D view unavailable</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#8a96a3]">{message}</p>
        <p className="mt-2 text-sm leading-relaxed text-[#8a96a3]">
          The simulation still runs — every metric in the panels updates as you move the slider.
        </p>
      </div>
    </div>
  );
}

class Boundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: Error) {
    return { error: e.message };
  }
  render() {
    if (this.state.error) return <Fallback message="The renderer hit an error. Try reloading the page." />;
    return this.props.children;
  }
}

function Loading() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0a0e13] text-sm text-[#8a96a3]">
      <span className="animate-pulse">Building neighborhood…</span>
    </div>
  );
}

interface Props {
  sim: SimulationResult;
  stage: CanopyStage;
  camera: { preset: CameraPreset; nonce: number };
}

export default function CityCanvas({ sim, stage, camera }: Props) {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => setOk(webglAvailable()), []);

  if (ok === null) return <Loading />;
  if (!ok) return <Fallback message="WebGL isn't available in this browser or has been disabled." />;

  return (
    <Boundary>
      <Suspense fallback={<Loading />}>
        <Canvas
          shadows="percentage"
          dpr={[1, 1.75]}
          camera={{ fov: 36, near: 1, far: 1200, position: INITIAL_CAMERA }}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          aria-label="Interactive 3D view of the fictional demonstration neighborhood. Drag to orbit, scroll to zoom."
        >
          <Scene sim={sim} stage={stage} camera={camera} />
        </Canvas>
      </Suspense>
    </Boundary>
  );
}
