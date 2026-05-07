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
- Added the first real GeoJSON Builder persistence schema:
  - `map_project`
  - `source_asset`
  - `control_point`
  - `georeference`
  - `geo_feature`
  - `agent_run`
  - `project_revision`
- Generated the next Drizzle migration through `pnpm --filter web db:generate`.
  - It creates the GeoJSON Builder tables.
  - It also drops the old resume tables because those schemas are no longer active.
  - It was applied locally with `pnpm --filter web db:migrate` against the file-backed dev DB.
- Added map project server/data access files:
  - list projects for the signed-in user
  - create projects for the signed-in user
  - update projects for the signed-in user
  - delete projects for the signed-in user
  - TanStack Query `queryOptions`
- Reworked `/map-projects` from a static schema demo into a real project list with:
  - empty state
  - TanStack Form creation dialog
  - Zod-backed create validation
  - live project cards with source asset and feature counts
  - project edit dialog for name, description, location hint, and base map
  - confirmed project deletion with source asset file cleanup
- Added the first map project workspace route:
  - `/map-projects/$projectId`
  - source asset panel
  - map canvas placeholder
  - georeferencing placeholder
  - workspace metrics
  - feature review panel
  - accepted/draft/rejected feature status breakdown
  - selected source asset context for georeferencing
- Added the first source asset upload path:
  - multipart API route at `/api/map-projects/$projectId/source-assets/upload`
  - local dev file storage under `apps/web/uploads/source-assets/...`
  - DB metadata row creation for uploaded PDFs/images
  - source asset query invalidation after upload
- Added authenticated source asset file serving:
  - `/api/map-projects/$projectId/source-assets/$sourceAssetId/file`
  - verifies the signed-in user owns the project
  - bounds file reads to local upload storage
  - returns the stored PDF/image with an inline content disposition
- Added richer in-app source asset preview inside the workspace:
  - selected image/PDF assets render inline in the map canvas panel
  - uploaded image dimensions appear in the source asset list and georeferencing panel
  - image control points render as numbered markers over the preview when dimensions are known
- Added source asset metadata editing in the workspace:
  - file display name
  - image width/height
  - PDF page count
  - blank optional metadata clears stored values
- Added upload progress feedback for source asset uploads:
  - selected file name and size are shown before submit
  - upload requests now report browser upload progress
  - the upload form clears after a successful attachment
- Added the first manual georeferencing write flow:
  - source asset selector in the workspace
  - TanStack Form control point entry for image pixel coordinates and longitude/latitude
  - server function with project ownership and source-asset ownership checks
  - workspace control point table
  - control point edit dialog with stale transform clearing
  - transform readiness hint once at least three control points exist
- Added the first manual feature draft flow:
  - TanStack Form point-feature entry in the workspace
  - source asset association
  - path kind, name, notes, and coordinate fields
  - server function writes `geo_feature` rows as `manual-trace`/`draft`
  - feature review table and status counts update from real DB rows
- Added affine georeference estimation:
  - generated and applied Drizzle migration `0003_fixed_whirlwind.sql`
  - added a JSON `transform` column on `georeference`
  - estimates pixel-to-lon/lat affine coefficients from at least three control points
  - stores RMS residual error in meters
  - clears stale georeferences when control points change
  - replaces a selected source asset's previous transform estimate instead of stacking duplicates
  - shows selected asset transform status in the workspace
- Added cleanup actions for early editor data:
  - delete source assets from the workspace with ownership checks
  - remove uploaded local files after source asset deletion
  - delete control points with ownership checks
  - refresh project/workspace queries after cleanup
- Added `uploads` to `apps/web/.gitignore`.
- Re-verified after the data layer work:
  - `pnpm --filter web check-types`
  - `pnpm --filter @repo/isomorphic check-types`
  - `pnpm --filter web build`
  - `pnpm lint`
  - unauthenticated source asset file route returns `401`
- Re-verified after affine/delete work:
  - `pnpm --filter web check-types`
  - `pnpm lint`
  - `pnpm --filter web build`
  - unauthenticated workspace route redirects to `/auth`
  - unauthenticated source asset upload route returns `401`

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
- `/map-projects/$projectId` is protected and redirects unauthenticated users to auth.
- `/api/mcp` returns `404`, which is intentional until the GeoJSON MCP bridge is rebuilt.
- `/api/map-projects/$projectId/source-assets/upload` returns `401` for unauthenticated requests.
- `/api/map-projects/$projectId/source-assets/$sourceAssetId/file` returns `401` for unauthenticated requests.
- The workspace can estimate an affine transform for a selected source asset once it has three or more control points.
- The workspace shows an inline preview for the selected source asset, with image control point markers when image dimensions are available.
- Source asset display metadata and control points can be edited from the workspace.
- Source asset uploads now show file size and progress while the browser is sending the file.
- Map project details can be edited from the project list.
- Source assets and control points can now be removed from the workspace.
- Map projects can be deleted from the project list, with owned source asset files cleaned up from local storage.
- Old copied code is preserved under `legacy/` but outside active type checking and Vite+ checks.
- The repo is now inside a git worktree, but current changes are uncommitted.
- Generated Drizzle migrations exist for the new data layer and affine transform column, and both have been run locally against the file-backed dev DB.

## Next Runs

### 3. Add Real Map Project Data Layer

Mostly complete for the first slice.

Done:

- create Drizzle schema for map projects, source assets, control points, features, agent runs, and revisions
- generate migrations through Drizzle commands only
- add server functions for listing/creating map projects
- add TanStack Query `queryOptions`
- wire `/map-projects` to real data instead of the static schema demo

Remaining:

- add archive behavior after create/update/delete are stable

### 4. Build The First Upload Flow

First source asset upload slice is in place.

Done:

- source asset upload UI
- store original PDF/image metadata
- decide storage target: local dev filesystem for early prototype

Remaining:

- read PDF page counts and preview dimensions
- decide production storage target: S3-compatible bucket or hosted volume
- add PDF raster/page preview controls beyond the current inline browser PDF embed

### 5. Build The Map Workspace Route

First workspace route is in place.

Done:

- route structure: `/map-projects/$projectId`
- route-specific components in `-components`
- placeholder map canvas with project details
- source asset panel
- georeferencing panel
- source asset selection for georeferencing
- manual control point creation form
- control point table
- source asset metadata edit dialogs
- control point edit dialogs
- manual point feature draft form
- estimate/store the first affine transform from control points
- remove source assets and control points from the workspace

Remaining:

- add transform history UI if keeping older estimates becomes useful
- add line/polygon manual draft creation once map drawing exists

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
