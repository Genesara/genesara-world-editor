# Genesara · Admin Dashboard

Operator god-view for a live Genesara world. Single-page React app, mounted by the Spring backend at `/dashboard/**`.

## Stack

- Vite + React 18 + TypeScript
- Tailwind v3, Radix UI primitives, lucide-react icons
- TanStack Query for REST, `@microsoft/fetch-event-source` for SSE (`Authorization: Bearer …`)
- React Router v6, react-hook-form, react-three-fiber

## Development

```bash
cd dashboard
npm install
npm run dev
```

The dev server runs on `http://localhost:5174/dashboard/` and proxies `/admin/**` to the Spring backend (default `http://localhost:8080` — override with `VITE_BACKEND_URL`).

Default dev login: `admin / secret`.

## Build

```bash
npm run build
```

Static assets land in `dashboard/dist/`. Copy/deploy that directory into the Spring backend's static-resource path (e.g. `app/src/main/resources/static/dashboard/`) for production serving from `/dashboard/**`.

## Auth model

The bearer token is held in memory only — a page reload signs you out. Any `401` clears the in-memory token and bounces you back to the login screen.

## Layout

```
dashboard/
├── index.html
├── src/
│   ├── App.tsx                    # router, providers
│   ├── main.tsx
│   ├── index.css                  # tailwind + design tokens
│   ├── components/
│   │   ├── layout/                # Shell, ConnectionPill
│   │   └── ui/                    # Button, Input, Dialog, ConfirmDialog, JsonTree, …
│   ├── lib/
│   │   ├── api/                   # REST client, ProblemDetail, MaybeSet, per-domain services
│   │   ├── auth/                  # AuthContext
│   │   ├── feed/                  # SSE client + GlobalFeedContext
│   │   ├── globe/                 # Goldberg geometry (ported from world editor)
│   │   ├── query/                 # TanStack Query client
│   │   ├── recent.tsx             # recent agents/nodes
│   │   └── types.ts
│   ├── routes/                    # LoginScreen, ProtectedRoute
│   └── views/                     # liveFeed, agentPanel, nodeDetail, worldMap, auditLog
└── README.md
```
