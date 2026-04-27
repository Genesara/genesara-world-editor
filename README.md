# AgenticRPG Map Editor

Hex-grid map painter for the AgenticRPG MMORPG world builder.

React + Vite + TypeScript, `react-konva` for canvas, `honeycomb-grid` for hex math, `simplex-noise` for procedural generation, MSW for an in-browser mock API (no separate backend required while developing).

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173.

`VITE_API_BASE_URL` defaults to `http://localhost:8080` and is intercepted by the MSW worker in dev. To point at a real backend, set it in `.env` and remove / gate the MSW startup in `src/main.tsx`.

## Features

- Paint a pointy-top hex grid with 30+ terrain types grouped by biome
- Dirty tracker — the Save button shows unsaved count and PATCHes only changed hexes
- Generate procedural maps from a seed (elevation + moisture noise + mystical sprinkle)
- Import / Export the current map as JSON

## Canvas controls

- **Click / drag** on a hex — paint with the active terrain
- **Shift + drag** — rectangle select; on release every hex whose center is inside the rect gets painted
- **Drag on empty space** — pan the view
- **Wheel / two-finger scroll** — pan the view (trackpads scroll both axes naturally)
- **Shift + wheel** — horizontal pan (useful for one-axis mouse wheels)
- **Ctrl / Cmd + wheel** — zoom toward the cursor (0.2x–5x); grid lines appear above 1.0x

## Scripts

- `npm run dev` — Vite dev server with MSW mocks
- `npm run build` — type-check and production build
- `npm run typecheck` — type-check without emit

## Layout

```
src/
  components/      MapCanvas · TerrainSidebar · Toolbar · StatusBar
  hooks/           useHexGrid · useDirtyTracker · useMapApi
  utils/           generateMap · exportJson · keyOf
  constants/       terrainColors · terrainGroups
  mocks/           MSW handlers + seed
  types/           Node, TerrainType
```
