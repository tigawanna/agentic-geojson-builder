import { safeStringToUrl } from "@/utils/url";
import { redirect } from "@tanstack/react-router";
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const requireViewerMiddleware = createMiddleware().server(async ({ next, request }) => {
  const { readSessionFromHeaders } = await import("@/lib/auth.session.server");
  const session = await readSessionFromHeaders(request.headers);
  if (!session) {
    const returnTo = safeStringToUrl(request.url)?.pathname ?? "/";
    throw redirect({ to: "/auth", search: { returnTo } });
  }
  return await next({
    context: {
      viewer: { user: session.user, session: session.session },
    },
  });
});

const mapIdSchema = z.object({
  mapId: z.number().int().positive(),
});

const tileStyleSchema = z.enum(["outline", "standard", "satellite"]);

const setTileCacheBoundsInputSchema = z.object({
  mapId: z.number().int().positive(),
  centerLat: z.number().min(-90).max(90),
  centerLng: z.number().min(-180).max(180),
  halfSideMeters: z.number().positive().max(20000),
  minZoom: z.number().int().min(10).max(20).optional(),
  maxZoom: z.number().int().min(10).max(20).optional(),
  style: tileStyleSchema.optional(),
});

const getMapSectorViewInputSchema = z.object({
  mapId: z.number().int().positive(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  zoom: z.number().int().min(10).max(20).optional(),
  width: z.number().int().min(128).max(2048).optional(),
  height: z.number().int().min(128).max(2048).optional(),
  style: tileStyleSchema.optional(),
});

export const getMapTileCacheFn = createServerFn({ method: "GET" })
  .middleware([requireViewerMiddleware])
  .inputValidator((input: z.infer<typeof mapIdSchema>) => mapIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { getMapTileCacheForUser } = await import("./tile-cache.server");
    return getMapTileCacheForUser(context.viewer.user.id, data.mapId);
  });

export const setMapTileCacheBoundsFn = createServerFn({ method: "POST" })
  .middleware([requireViewerMiddleware])
  .inputValidator((input: z.infer<typeof setTileCacheBoundsInputSchema>) =>
    setTileCacheBoundsInputSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    const { setMapTileCacheBoundsForUser } = await import("./tile-cache.server");
    return setMapTileCacheBoundsForUser(context.viewer.user.id, data);
  });

export const buildMapTileCacheFn = createServerFn({ method: "POST" })
  .middleware([requireViewerMiddleware])
  .inputValidator((input: z.infer<typeof mapIdSchema>) => mapIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { buildMapTileCacheForUser } = await import("./tile-cache.server");
    return buildMapTileCacheForUser(context.viewer.user.id, data.mapId);
  });

export const getMapSectorViewFn = createServerFn({ method: "POST" })
  .middleware([requireViewerMiddleware])
  .inputValidator((input: z.infer<typeof getMapSectorViewInputSchema>) =>
    getMapSectorViewInputSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    const { getMapSectorViewForUser } = await import("./tile-cache.server");
    return getMapSectorViewForUser(context.viewer.user.id, data);
  });
