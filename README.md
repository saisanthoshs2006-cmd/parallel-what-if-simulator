# Parallel — Rewrite Your City

An interactive urban what-if simulator. Convert surface parking into green space in a **fictional demonstration neighborhood** and see the 3D city, the green-space metrics and the parking trade-off change together.

**Live demo:** _add your Vercel URL here after deploying (see "Deploy")._

> Everything is illustrative. The neighborhood is fictional and every number comes from the explicit assumptions below, not from real-world measurements or predictions.

## Problem and solution

Planning debates about parking are hard to picture: people argue about "what if we removed 40% of parking?" without seeing it or its cost. Parallel makes the decision visible and explainable. Drag one slider and watch stalls turn into planted strips while a parking-pressure indicator shows when assumed demand no longer fits. A Compare mode lets you drag a divider across the same city to see baseline and scenario side by side.

## Core features

- **Conversion slider (0–100%)** — deterministic: the same slider value always converts the same stalls.
- **Green space metrics** — added green area, trees planted, canopy at maturity.
- **Parking pressure** — retained spaces vs an assumed demand of 104 cars; shows the last level (28%) where demand still fits and marks unhoused cars in amber.
- **Before / After / Compare** — Compare puts a draggable divider through the 3D viewport (baseline left, scenario right, one shared camera).
- **Demos** — *Play 40% demo* and *Play reveal*, both cancellable; they jump between states under `prefers-reduced-motion`.
- **Shareable links** — state lives in the URL, e.g. `/?conversion=40&view=compare&split=62`.
- **Accessible controls** — labelled slider and divider, keyboard operation, reduced-motion support.

## Technology

Next.js 15 (App Router) · TypeScript · React Three Fiber / three.js · Zustand · Tailwind CSS 4 · Motion · Lucide · Vitest.
The 3D scene uses instanced meshes (about 42 draw calls, 84 while comparing).

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000
npm run lint && npm run typecheck && npm test
npm run build && npm start
```

Requires Node 20+ and a WebGL-capable browser (a clear fallback is shown otherwise; the metrics still work).

## Simulation assumptions and limitations

All values live in [`lib/config/assumptions.ts`](lib/config/assumptions.ts):

| Assumption | Value |
| --- | --- |
| Area per parking space | 12.5 m² (stall only; aisles stay) |
| Plantable share of converted area | 70% |
| Planting density | 1 tree per 30 m² of plantable area |
| Mature canopy per tree | 20 m² |
| Existing street-tree canopy | 20 m² per tree |
| Illustrative parking demand | 104 cars (about 72% of 144 spaces) |

Model: converted stalls = first N of a fixed order (N = round(pct × 144 / 100)); green area = N × 12.5 × 0.7; trees = floor(green ÷ 30); canopy = trees × 20; unaccommodated demand = max(0, 104 − retained spaces).

Limitations:
- Fictional neighborhood; no real city data.
- Outputs are arithmetic consequences of the assumptions, not predictions or measurements.
- No claims about temperature, air quality, stormwater, health, traffic or cost.
- "Without a space" is a shortfall indicator only; it does not predict where cars would go.
- Tree survival, species and overlapping crowns are ignored; canopy is shown at maturity.
- Existing street trees render as small dots for visual simplicity while the metrics assume a 20 m² canopy each.

## Architecture

```
app/                  Next.js App Router
components/city/      3D scene: environment, instanced parking/trees/traffic, camera, Compare renderer + divider
components/simulation Controls and insights panels
lib/simulation/       Pure deterministic engine, layout, URL codec
lib/config/           Assumptions and feature switch
store/                Per-request Zustand store
hooks/                URL sync and demo playback
tests/                Vitest suites (engine, URL, store, instancing targets, camera framing, compare)
```

Compare mode renders one scene twice per frame with the same camera, scissored at the divider, using three.js layers for the scenario-dependent copies. `COMPARE_ENABLED` in `lib/config/features.ts` turns it off.

## Deploy (Vercel)

1. Push the repo to GitHub.
2. In Vercel: **Add New → Project**, import the repo (Next.js is auto-detected; no environment variables needed) and deploy.
3. Or with the CLI: `npx vercel` then `npx vercel --prod`.

The page is rendered per request so shared links show the right scenario on first paint.

## Demo

See [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) for the 90-second script (and the longer three-minute version in git history). To see it yourself: open the app, click **Play reveal**, then drag the divider.
