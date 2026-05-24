# Agentic GeoJSON Builder

A full-stack TypeScript workspace for turning map images and PDFs into editable, validated GeoJSON. The motivating case is a Karura Forest map PDF from Nairobi: a static map with useful labels for bike paths, dog paths, trail sections, and park features that should become structured spatial data.

The product direction is hybrid by design. A human georeferences an image overlay, traces paths, and corrects every vertex. An agent inspects the source image plus a base map, proposes GeoJSON features, and hands them back as editable drafts — all against the **same server Postgres state**.

---

## Current status

| Area                                   | Status            |
| -------------------------------------- | ----------------- |
| Map workspace UI (`/maps`)             | Done              |
| Postgres persistence + auth scoping    | Done              |
| Control points (32 on Karura map id 1) | Imported          |
| Affine georeference                    | Next              |
| Agent / MCP tools                      | Planned (Phase 2) |

Handoff checklist: [`TODOS.md`](TODOS.md)

---

## Stack

| Layer         | Choice                                     |
| ------------- | ------------------------------------------ |
| Monorepo      | pnpm workspaces + Turbo                    |
| App framework | TanStack Start (SSR-capable React)         |
| Routing       | TanStack Router (file-based)               |
| Data fetching | TanStack Query + `createServerFn`          |
| Database      | PostgreSQL + PostGIS + Drizzle             |
| Styling       | Tailwind CSS v4 + DaisyUI tokens           |
| Auth          | Better Auth                                |
| Agent tooling | TanStack AI, OpenRouter, MCP SDK (planned) |
| Tooling       | Vite+ (`vp` CLI)                           |

---

## Scripts

```bash
pnpm install
pnpm dev                    # from repo root
pnpm --filter web db:migrate
pnpm --filter web db:import-stash -- --list-users   # recover stashed control points
```

Use **`vp`** from the repo root for lint/format/test where available.

---

## Documentation

| Doc                                                                      | Purpose                                             |
| ------------------------------------------------------------------------ | --------------------------------------------------- |
| [`TODOS.md`](TODOS.md)                                                   | Phased checklist and tool inventory                 |
| [`docs/map-workspace-features.md`](docs/map-workspace-features.md)       | Implemented UI features                             |
| [`docs/agent-digitization-design.md`](docs/agent-digitization-design.md) | Agent chunking, vision vs coordinates, verification |
| [`GAMEPLAN.md`](GAMEPLAN.md)                                             | Product workflow and modules                        |
| [`ARCHITECTURE.md`](ARCHITECTURE.md)                                     | Stack, data layer, repo layout                      |
| [`VISION.md`](VISION.md)                                                 | Product vision                                      |

---

## License

Add your license.
