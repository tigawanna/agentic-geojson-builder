# Agentic GeoJSON Builder

A full-stack TypeScript workspace for turning map images and PDFs into editable, validated GeoJSON. The motivating case is a Karura Forest map PDF from Nairobi: a static map with useful labels for bike paths, dog paths, trail sections, and park features that should become structured spatial data.

The product direction is hybrid by design. A human should be able to georeference an image overlay, trace paths carefully with a mouse, and correct every vertex. An agent should be able to inspect the source image plus a base map, propose GeoJSON features, and hand them back as editable drafts.

---

## Phase One Scope

Phase one is about making the project honest again:

- reset branding and docs away from the copied resume project
- keep the useful TypeScript/TanStack/Better Auth foundation
- design the map editing, georeferencing, agent tools, and MCP boundary before deeper schema work
- remove old dashboard/app surfaces from active compilation while preserving them under `legacy/`

## Stack

| Layer         | Choice                             |
| ------------- | ---------------------------------- |
| Monorepo      | pnpm workspaces + Turbo            |
| App framework | TanStack Start (SSR-capable React) |
| Routing       | TanStack Router (file-based)       |
| Data fetching | TanStack Query                     |
| Styling       | Tailwind CSS v4 + DaisyUI tokens   |
| Auth          | Better Auth                        |
| Agent tooling | TanStack AI, OpenRouter, MCP SDK   |
| Tooling       | Vite+ (`vp` CLI)                   |

- **Package name:** `agentic-geojson-builder` (root `package.json`)
- **App branding:** `apps/web/src/utils/system.tsx` (`AppConfig`)

## Scripts

```bash
pnpm install
pnpm dev
```

Use **`vp`** from the repo root for lint/format/test where available.

## Docs

- `VISION.md` - product problem and direction.
- `ARCHITECTURE.md` - technical architecture decisions.
- `GAMEPLAN.md` - phase plan for the image-to-GeoJSON builder.

## License

Add your license.
