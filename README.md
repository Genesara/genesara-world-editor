# AgenticRPG Map Editor

Browser-based world builder for the AgenticRPG MMORPG. Sketches a planet as a Goldberg polyhedron, lets you assign biomes and climates per face, then drills down into per-face hex grids for fine-grained terrain painting.

Built with React, Vite, TypeScript, `react-three-fiber` for the 3D globe, `react-konva` for the 2D hex canvas, `honeycomb-grid` for hex math, and `simplex-noise` for procedural seeding. MSW provides an in-browser mock API so the editor runs without a live backend during development.

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173.

On first launch the app asks for a backend URL and stores it in `localStorage`. You can change it later from **Settings** in the worlds list, or **Backend settings** on the login screen. The `VITE_API_BASE_URL` env var is used only as a build-time default suggestion — once a value is saved, it takes precedence at runtime.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server with MSW mocks |
| `npm run build` | Type-check and produce a production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Type-check without emit |
| `npm test` | Run the unit test suite once |
| `npm run test:watch` | Run tests in watch mode |

## Architecture

```
src/
  App.tsx              Root view router: first-launch → login → worlds → globe → editor
  screens/
    FirstLaunchScreen  Backend URL setup, shown when no URL is configured
    LoginScreen        Bearer-token login against /admin/login
    WorldsScreen       List + create worlds
    GlobeScreen        3D Goldberg polyhedron, biome/climate painting per face
    EditorScreen       2D hex grid for one face, per-hex terrain painting
  components/
    SettingsDialog     Edit the saved backend URL
    MapCanvas          Konva-based hex canvas
    Toolbar            Editor toolbar
    TerrainSidebar     Terrain palette
    StatusBar          Bottom status bar
    globe/             Globe-specific dialogs, mesh, geometry, shaders
  hooks/
    useWorldsApi       /api/worlds list/get/create
    useGlobeApi        /api/worlds/:id/nodes CRUD
    useMapApi          /api/worlds/:id/nodes/:i/hexes load/save
    useHexGrid         Hex layout helpers
    useDirtyTracker    Tracks unsaved hex edits
  utils/
    api.ts             authFetch + login
    apiConfig.ts       Runtime backend URL (localStorage > env > none)
    goldberg.ts        Goldberg polyhedron math
    sphereTerrain.ts   Per-face terrain seeding
    generateMap.ts     Procedural map generation
    keyOf.ts           Hex-coordinate key helper
    exportJson.ts      Map import/export
  mocks/               MSW handlers + in-memory storage for offline dev
  constants/           Biome / climate / terrain palettes
```

## Backend URL configuration

The editor is designed to run as a static bundle (e.g. on GitHub Pages) and target any user's self-hosted backend. The runtime resolution order is:

1. Value saved in `localStorage` under `agentic-rpg:api-base-url`
2. `VITE_API_BASE_URL` baked into the build
3. None — the first-launch screen is shown

URLs are validated to be `http://` or `https://` and have any trailing slash stripped before storage. Changing the URL via Settings dispatches a `config:base-url-changed` event; subsequent API requests pick up the new value without a reload.

## Editor canvas controls

- **Click / drag** on a hex — paint with the active terrain
- **Shift + drag** — rectangle select; on release every hex whose center is inside the rect gets painted
- **Drag on empty space** — pan the view
- **Wheel / two-finger scroll** — pan (trackpads scroll both axes)
- **Shift + wheel** — horizontal pan
- **Ctrl / Cmd + wheel** — zoom toward the cursor (0.2x–5x); grid lines appear above 1.0x

## Mocks

`VITE_USE_MOCKS=true` (the dev default) starts MSW with an in-memory backend that persists worlds and nodes to `localStorage` so a refresh does not lose work. Set it to `false` to bypass mocks and hit the real backend at the configured URL.

## Deployment

The repo ships with three GitHub Actions workflows:

- **CI** (`.github/workflows/ci.yml`) — runs typecheck, tests, and a production build on every push and pull request to `main`.
- **Deploy to GitHub Pages** (`.github/workflows/deploy.yml`) — builds with `VITE_BASE_PATH=/genesara-world-editor/` and publishes `dist/` to GitHub Pages on every push to `main`. Pages must be enabled in the repo settings with "GitHub Actions" as the source.
- **Release Please** (`.github/workflows/release-please.yml`) — opens / updates a release PR based on Conventional Commits and tags a release when merged.

For local production builds:

```bash
npm run build         # base path "/"
VITE_BASE_PATH=/some-path/ npm run build
```

Leave `VITE_API_BASE_URL` unset in the production build so every visitor is prompted for their own backend URL on first launch.

## Commit conventions

Commits follow [Conventional Commits](https://www.conventionalcommits.org/) so release-please can manage versioning and the changelog automatically:

- `feat:` — new feature (minor bump)
- `fix:` — bug fix (patch bump)
- `feat!:` or `BREAKING CHANGE:` — breaking change (major bump)
- `chore:`, `ci:`, `docs:`, `refactor:`, `test:`, `perf:`, `style:` — non-release-bumping types

Release-please configuration lives in `release-please-config.json` and `.release-please-manifest.json`.
