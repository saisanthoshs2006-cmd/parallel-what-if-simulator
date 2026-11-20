# Parallel — Rewrite Your City

An interactive urban what-if simulator. Convert surface parking into green space in a **fictional demonstration neighborhood** and watch the 3D city and the metrics change together. Every outcome is a deterministic, explainable consequence of explicit assumptions.

> Default question: *"What if we converted 40% of neighborhood parking into green space?"*

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build && npm start` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm test` | Vitest (simulation, URL codec, store) |

Requires Node 20+ and a WebGL-capable browser (a clear fallback is shown otherwise; metrics still work).

## The ten-step flow

1. Open the app → 3D neighborhood loads at baseline (0%).
2. Move the **Parking converted to green** slider (0–100%).
3. Stalls rise into planted strips and trees grow in; cars on converted stalls disappear.
4. Metrics, bars and the response curve update immediately.
5. **Before / After** toggle (sidebar or top of the scene) flips between baseline and scenario.
6. **Reset** returns to baseline. **Play 40% demo** runs the scripted scenario.
7. **Share** copies a URL such as `/?conversion=40&view=after&canopy=mature`; opening it restores the same state.

## Architecture

```
app/                  Next.js App Router (layout, page, Tailwind theme)
components/
  Workspace.tsx       3-column workspace; computes simulations once per state
  city/               React Three Fiber scene (environment, parking, trees, traffic, camera)
  simulation/         Controls panel, insights panel, parking-pressure card
  ui/                 Segmented control, tags, animated number
lib/
  config/assumptions.ts   ← every model number, with units and notes
  simulation/
    layout.ts         Deterministic neighborhood: blocks, buildings, 144 stalls, conversion order
    engine.ts         Pure simulate(pct) → metrics + converted IDs + planted trees
    scenario-url.ts   Serialise / parse / clamp scenario query params
    prng.ts           Seeded PRNG + string hash
store/                Zustand store (vanilla factory + app singleton)
hooks/                URL sync, scripted demo player
tests/                Vitest suites
```

**Single source of truth.** The scene never decides what is converted. `Workspace` calls `simulate(pct)`; the returned `convertedIds` and `trees` drive both the 3D stalls/trees and the numbers. The neighborhood is generated once from a fixed seed and never regenerated when the slider moves.

### Simulation model

1. **Which stalls convert:** the first *N* IDs of a fixed order (perimeter rows first, then by column, interleaved across lots). *N = round(pct × 144 / 100)*. Monotonic: raising the slider never un-converts a stall.
2. **Converted area** = N × 12.5 m².
3. **Green area** = converted area × 0.7 (plantable share).
4. **Trees** = floor(green area ÷ 30 m² per tree). Tree *k* is hosted by a fixed stall, so trees don't jump around.
5. **Added canopy at maturity** = trees × 20 m² (crown projection).

6. **Parking pressure (illustrative):** assumed demand is 104 cars (≈72% of 144 stalls, an assumption in `assumptions.ts`). Without a space = max(0, demand − retained). The largest conversion with no shortfall is 28% (40 spaces); the first shortfall is at 29%. Baseline cars sit in a fixed hash-ranked set of stalls; a car whose stall is converted moves to an empty retained stall if one exists, otherwise it is shown as an amber translucent “ghost” car on its former stall.

All values are in [`lib/config/assumptions.ts`](lib/config/assumptions.ts).

### What is and isn't claimed

- **Model outputs** — computed by the engine from the assumptions.
- **Assumptions** — inputs we chose (listed in the UI).
- **Real-world measurements** — none. The neighborhood is fictional.
- No claims about temperature, air quality, stormwater, health, traffic or cost.
- Parking demand is a single assumed number. “Without a space” is a shortfall indicator, not a prediction of displacement, circling, spillover or traffic; the amber ghost cars are an illustration, not a vehicle simulation.

## Deploy to Vercel

1. Push the repo to GitHub.
2. In Vercel: **Add New → Project**, import the repo. Framework preset: **Next.js** (auto-detected).
3. No environment variables are required. Deploy.

Or with the CLI: `npx vercel` then `npx vercel --prod`.

## Demo

See [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) for a three-minute script.
