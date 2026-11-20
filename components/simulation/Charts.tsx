"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { sweep } from "@/lib/simulation/engine";
import type { SimulationResult } from "@/lib/simulation/types";

const AMBER = "#d9a441";
const LEAF = "#5fd38d";
const AXIS = { fontSize: 10, fill: "#8d99a6" };
const TIP = {
  contentStyle: {
    background: "#0e1318",
    border: "1px solid #1e262e",
    borderRadius: 8,
    fontSize: 12,
    color: "#e7ecf1",
  },
  itemStyle: { color: "#e7ecf1" },
  labelStyle: { color: "#8d99a6" },
  cursor: { fill: "rgba(255,255,255,0.04)" },
} as const;

export function ParkingCompositionChart({ baseline, scenario }: { baseline: SimulationResult; scenario: SimulationResult }) {
  const data = [
    { name: "Baseline", retained: baseline.retainedCount, converted: baseline.convertedCount },
    { name: "Scenario", retained: scenario.retainedCount, converted: scenario.convertedCount },
  ];
  return (
    <div role="img" aria-label={`Parking spaces: baseline ${baseline.retainedCount} retained; scenario ${scenario.retainedCount} retained and ${scenario.convertedCount} converted.`} className="h-[110px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }} barSize={22}>
          <XAxis type="number" domain={[0, baseline.totalSpaces]} tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={AXIS} axisLine={false} tickLine={false} width={62} />
          <Tooltip {...TIP} />
          <Bar dataKey="retained" name="Parking retained" stackId="a" fill={AMBER} isAnimationActive={false} />
          <Bar dataKey="converted" name="Converted to green" stackId="a" fill={LEAF} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CanopyCurveChart({ current }: { current: SimulationResult }) {
  const data = useMemo(() => sweep(2).map((r) => ({ pct: r.pct, canopy: r.addedCanopy })), []);
  return (
    <div role="img" aria-label={`Added canopy at maturity versus conversion percentage. At ${current.conversionPct}% the model gives ${current.addedCanopyM2} square metres.`} className="h-[150px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: -14 }}>
          <defs>
            <linearGradient id="canopyFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={LEAF} stopOpacity={0.35} />
              <stop offset="100%" stopColor={LEAF} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1e262e" vertical={false} />
          <XAxis dataKey="pct" tick={AXIS} axisLine={false} tickLine={false} unit="%" />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} />
          <Tooltip {...TIP} formatter={(v) => [`${v} m²`, "Added canopy"]} labelFormatter={(l) => `${l}% converted`} />
          <Area type="stepAfter" dataKey="canopy" stroke={LEAF} strokeWidth={1.75} fill="url(#canopyFill)" isAnimationActive={false} />
          <ReferenceDot x={current.conversionPct - (current.conversionPct % 2)} y={current.addedCanopyM2} r={5} fill="#fff" stroke={LEAF} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
