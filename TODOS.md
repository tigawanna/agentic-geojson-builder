# Agentic GeoJSON Builder - Running TODOs

Last updated: May 7, 2026

This is the handoff note between runs. It tracks the project shape, the cleanup already done, and the highest-value next steps.

## Current Snapshot

- Active workspace packages are now only:
  - `apps/web`
  - `packages/isomorphic`
  - `packages/ui`
  - `packages/typescript-config`
- Archived copied code lives under `legacy/` and is excluded from active TypeScript and Vite+ checks.
- `apps/web` is the TanStack Start app and currently exposes:
  - landing page
  - auth routes
  - dashboard shell
  - `/dashboard`
  - `/map-projects`
  - `/settings`
  - Better Auth API route
- `/map-projects` is protected and redirects unauthenticated users to auth.
- `/api/mcp` intentionally returns `404` until the GeoJSON MCP bridge is rebuilt.
- Dev server is reachable at `http://localhost:3040/`.
- The repo is still not initialized as git, so there is no commit history safety net yet.

## Verification Status

Clean as of this update:

```bash
vp check
pnpm check-types
pnpm --filter @repo/isomorphic check-types
pnpm --filter web check-types
pnpm --filter web build
```

Known non-blocking build note:

- Production build still warns about large chunks. This is not failing, but should be revisited once routes and map/editor dependencies grow.

## Covered Ground

- Renamed the root package from `agentic-json-resume` to `agentic-geojson-builder`.
- Rewrote `README.md`, `VISION.md`, `ARCHITECTURE.md`, and `GAMEPLAN.md` around the image/PDF-to-GeoJSON product direction.
- Updated active app branding through `apps/web/src/utils/system.tsx`.
- Reworked the landing page around source-map upload, overlay alignment, manual tracing, agent draft review, and GeoJSON export.
- Replaced the old dashboard landing content with a GeoJSON workspace overview.
- Added the first active map-project route and page:
  - `apps/web/src/routes/_dashboard/map-projects/index.tsx`
  - `apps/web/src/routes/_dashboard/map-projects/-components/MapProjectsPage.tsx`
- Added shared Zod schemas in `packages/isomorphic/src/geojson-builder.ts` for:
  - GeoJSON geometry and FeatureCollection
  - map project metadata
  - source assets
  - georeference and control points
  - agent run/tool contracts
- Added `zod` to `@repo/isomorphic`.
- Removed old copied resume routes from the active router surface.
- Removed old active MCP/API routes that exposed copied resume tooling.
- Moved copied app/code archives out of the active workspace:
  - `legacy/apps-web-copied-resume-app`
  - `legacy/apps-api-copied-kitchen-app`
  - `legacy/apps-spa-copied-shell`
- Narrowed `pnpm-workspace.yaml` to `apps/web` and `packages/*`.
- Added root `tsconfig.json` and Vite+ ignore patterns for:
  - `legacy/**`
  - `**/routeTree.gen.ts`
- Moved old resume Drizzle schema files out of the active web app.
- Left the active Drizzle schema barrel exporting Better Auth tables only.
- Replaced old kitchen/menu organization permission names with GeoJSON project-oriented role statements.
- Updated API key permissions and visible settings copy from resume language to map-project language.
- Removed the active `octokit` dependency after archiving the only Octokit helper.
- Replaced the old MCP settings flow with a disabled GeoJSON MCP bridge placeholder.

## Next Runs

### 1. Initialize Repo Safety

This should happen before more schema/editor work.

- Run `git init`.
- Review the current file set.
- Make a first checkpoint commit.
- Keep `.env` and local database files out of any public history.

### 2. Decide Legacy Archive Fate

The archive is useful for reference, but it should not ship with a public repo.

- Decide whether `legacy/` is still useful.
- Delete it before public push, or move it to a separate private reference repo.
- Rebuild useful patterns as GeoJSON-specific modules instead of reactivating copied code wholesale.

### 3. Add Real Map Project Persistence

The shared schemas exist, but `/map-projects` still uses static/demo data.

- Create Drizzle schema for map projects, source assets, control points, features, agent runs, and revisions.
- Generate migrations through Drizzle commands only.
- Add server functions for listing/creating map projects.
- Add TanStack Query `queryOptions`.
- Wire `/map-projects` to real persisted data.

### 4. Build First Upload Flow

The first valuable workflow is project creation plus source-map attachment.

- Add project creation form with TanStack Form and Zod validation.
- Add source PDF/image upload UI.
- Store original file metadata and rendered page metadata.
- Pick early storage: local filesystem, S3-compatible storage, or database blob for prototype only.

### 5. Build Map Workspace Route

Create the route that will host the editor.

- Add `/map-projects/$projectId`.
- Put route-specific components under `-components`.
- Add placeholder map canvas.
- Add source asset panel.
- Add feature list panel.
- Add georeferencing panel.

### 6. Choose GIS UI Libraries

Likely starting stack:

- Leaflet for map display.
- Leaflet-Geoman for drawing/editing.
- Turf modules for validation, measurements, simplification, and geometry sanity checks.
- PDF.js or server-side Poppler for PDF rasterization.

Open question:

- Whether Google Maps should be a secondary tab/provider when OSM imagery or labels are insufficient.

### 7. Rebuild Agent And MCP Boundary

Agent output should create reviewable drafts, not silently mutate accepted GeoJSON.

Suggested tools:

- `get_project_context`
- `get_rendered_map_view`
- `propose_features_from_overlay`
- `validate_geojson_features`
- `apply_feature_patch`
- `explain_feature`

## Known Cleanup Debt

- `apps/web/.env` contains local secrets; move real secrets out before any public push.
- `legacy/` is ignored by checks but still present on disk.
- Some generic UI/wrapper components have copied names or rough edges; they are not blocking the GeoJSON product direction yet.
- Better Auth organization roles are GeoJSON-shaped, but the custom access-control builder is not passed into the plugin until the real permission layer is designed.
