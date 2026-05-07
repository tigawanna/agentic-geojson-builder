# Technical architecture - Agentic GeoJSON Builder

## Product

**Agentic GeoJSON Builder** is a web app for converting map images and PDFs into georeferenced, editable GeoJSON. The app should let people trace paths manually, let agents propose draft features, and keep both workflows pointed at the same validated project state.

The codebase is a **pnpm + Turbo** monorepo with **Vite+** tooling and **`apps/web`** as the main **TanStack Start** app (TanStack Router, TanStack Query, SSR-capable React). Older copied app shells are preserved under `legacy/` and ignored by TypeScript and Vite+ checks.

Branding and copy live in `apps/web/src/utils/system.tsx` (`AppConfig`).

---

## Repository layout

| Path         | Role                                                               |
| ------------ | ------------------------------------------------------------------ |
| `apps/web`   | TanStack Start app: UI, auth, project workspace, future map editor |
| `legacy/`    | Archived copied app/schema code; excluded from active checks       |
| `packages/*` | Shared libraries, types, configs                                   |
| Root         | `package.json` scripts, Turbo pipeline, Vite+ CLI (`vp`)           |

---

## Frontend

- **TanStack Router** - File-based routes under `src/routes/`; `routeTree.gen.ts` is generated.
- **TanStack Query** - Data fetching; SSR integration via `@tanstack/react-router-ssr-query`.
- **Styling** - Tailwind CSS v4, shadcn-style UI, DaisyUI theme tokens where needed.
- **Auth** - Better Auth; dashboard routes can be protected with `beforeLoad` / middleware.

Planned product modules:

- **Project workspace** - upload source maps, store metadata, manage versions.
- **Georeferencing** - collect control points, transform image coordinates into map coordinates.
- **Map editor** - draw LineString, Polygon, Point, and Multi\* features with snapping and vertex editing.
- **Feature schema** - validate GeoJSON plus app-specific properties such as path type, confidence, source, and review status.
- **Agent review loop** - agent drafts become editable features with confidence and provenance.
- **Export** - GeoJSON FeatureCollection first, with later support for GPX, MBTiles, or vector tiles if needed.

---

## Tooling

- **`vp`** - Install, dev, build, lint, format, test where supported.
- Prefer repo scripts over ad hoc tool invocations.
- Keep server-only code in `*.server.ts` files and inside TanStack Start server function boundaries.

---

## Environment

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/app?sslmode=require
# Add secrets for auth, upload storage, tile providers, and OpenRouter as needed
```

---

## Customization

1. Set `AppConfig` and absolute OG URLs in `apps/web/src/routes/__root.tsx` when you have a production domain.
2. Implement shared GeoJSON/project schemas under `packages/isomorphic`.
3. Build the map workspace in `apps/web` before adding public sharing or heavier agent flows.

---

## Further reading

- [TanStack Start](https://tanstack.com/start)
- [TanStack Router](https://tanstack.com/router)
