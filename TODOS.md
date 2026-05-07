# Agentic GeoJSON Builder - Running TODOs

This file tracks what has been cleaned up, what is active now, and what should come next. Treat it as the handoff note between runs.

## Covered Ground

- Renamed the root package from `agentic-json-resume` to `agentic-geojson-builder`.
- Rewrote the main docs around the image/PDF-to-GeoJSON product direction:
  - `README.md`
  - `VISION.md`
  - `ARCHITECTURE.md`
  - `GAMEPLAN.md`
- Updated active app branding through `apps/web/src/utils/system.tsx`.
- Reworked the landing page copy and mock visuals around:
  - source map upload
  - overlay alignment
  - manual tracing
  - agent draft review
  - GeoJSON export
- Replaced the old dashboard landing content with a GeoJSON workspace overview.
- Added the first active map-project route:
  - `/map-projects`
  - `apps/web/src/routes/_dashboard/map-projects/index.tsx`
  - `apps/web/src/routes/_dashboard/map-projects/-components/MapProjectsPage.tsx`
- Added shared Zod schemas for the new product contract:
  - `packages/isomorphic/src/geojson-builder.ts`
  - GeoJSON geometry and FeatureCollection schemas
  - map project schema
  - source asset schema
  - georeference and control point schemas
  - agent run/tool schemas
- Added `zod` to `@repo/isomorphic`.
- Removed old copied resume routes from the active router surface.
- Removed old active MCP/API routes that still exposed resume tooling.
- Moved copied resume app code out of active compilation to:
  - `legacy/apps-web-copied-resume-app`
- Moved the copied kitchen API and starter SPA out of the active workspace to:
  - `legacy/apps-api-copied-kitchen-app`
  - `legacy/apps-spa-copied-shell`
- Narrowed `pnpm-workspace.yaml` to `apps/web` and `packages/*`.
- Added a root `tsconfig.json` boundary and Vite+ ignore patterns so `legacy/**` is ignored by TypeScript, `vp fmt`, and `vp lint`.
- Added `**/routeTree.gen.ts` to the Vite+ ignore patterns so generated TanStack Router output does not block clean checks.
- Moved old resume Drizzle schema files out of the active web app and left the active schema barrel exporting Better Auth tables only.
- Replaced old kitchen/menu organization permission names with GeoJSON project-oriented role statements in `packages/isomorphic/src/auth-roles.ts`.
- Updated API key permissions and visible settings copy from resume language to map-project language.
- Removed the active `octokit` dependency after moving the only Octokit helper into the legacy archive.
- Updated active auth/settings/toolbar copy away from resume language.
- Replaced the old MCP settings flow with a disabled GeoJSON MCP bridge placeholder.
- Verified:
  - `vp check`
  - `pnpm check-types`
  - `pnpm --filter @repo/isomorphic check-types`
  - `pnpm --filter web check-types`
  - `pnpm --filter web build`
- Restarted the dev server at `http://localhost:3040/`.

## Current State

- The active `apps/web/src` app now has a much smaller route surface:
  - landing page
  - auth routes
  - dashboard shell
  - `/dashboard`
  - `/map-projects`
  - `/settings`
  - Better Auth API route
- `/map-projects` is protected and redirects unauthenticated users to auth.
- `/api/mcp` returns `404`, which is intentional until the GeoJSON MCP bridge is rebuilt.
- Old copied code is preserved under `legacy/` but outside active type checking and Vite+ checks.
- The repo still is not a git repository, so there is no commit history safety net yet.

## Next Runs

### 3. Add Real Map Project Data Layer

The schemas exist, but the app does not persist map projects yet.

Suggested work:

- create Drizzle schema for map projects, source assets, control points, features, agent runs, and revisions
- generate migrations through Drizzle commands only
- add server functions for listing/creating map projects
- add TanStack Query `queryOptions`
- wire `/map-projects` to real data instead of the static schema demo

### 4. Build The First Upload Flow

Add the first useful workflow: create a project and attach a source map.

Suggested work:

- project creation form with TanStack Form and Zod validation
- source asset upload UI
- store original PDF/image metadata
- decide storage target: local dev filesystem, S3-compatible bucket, or database blob only for early prototype

### 5. Build The Map Workspace Route

Create the route that will eventually host the actual editor.

Suggested work:

- route structure: `/map-projects/$projectId`
- route-specific components in `-components`
- placeholder map canvas with project details
- source asset panel
- feature list panel
- georeferencing panel

### 6. Choose Map Editing Libraries

Pick the first real GIS UI stack.

Likely starting point:

- Leaflet for map display
- Leaflet-Geoman for drawing/editing
- Turf modules for geometry validation and measurements
- PDF.js or server-side Poppler for source PDF rasterization

Open question:

- whether Google Maps is a secondary tab/provider only when OSM imagery or labels are insufficient

### 7. Design The Agent Tool Boundary

Rebuild MCP and in-app AI around GeoJSON tools, not resume tools.

Suggested tools:

- `get_project_context`
- `get_rendered_map_view`
- `propose_features_from_overlay`
- `validate_geojson_features`
- `apply_feature_patch`
- `explain_feature`
- `draw_shape`

Important constraint:

- agent output should create reviewable drafts, not silently mutate accepted GeoJSON.

## Known Cleanup Debt

- `apps/web/.env` contains local secrets; move real secrets out before any public push.
- `legacy/` still contains copied project code by design; it is ignored by active checks but should not ship with a public repo.
- Some generic UI/wrapper components have typos or copied names, but they are not blocking the new product direction yet.
- The Better Auth organization plugin is using the GeoJSON role definitions without passing the custom access-control builder until the real permission layer is designed.
