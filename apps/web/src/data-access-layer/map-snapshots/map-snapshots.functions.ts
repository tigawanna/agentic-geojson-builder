import { safeStringToUrl } from "@/utils/url";
import { redirect } from "@tanstack/react-router";
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { RenderedMapView } from "@/lib/rendered-map-view/types";

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

const renderedMapViewSchema = z.custom<RenderedMapView>(
  (value) => typeof value === "object" && value !== null,
);

const saveRenderedMapViewInputSchema = z.object({
  mapId: z.number().int().positive(),
  snapshot: renderedMapViewSchema,
});

export const getRenderedMapViewFn = createServerFn({ method: "GET" })
  .middleware([requireViewerMiddleware])
  .inputValidator((input: z.infer<typeof mapIdSchema>) => mapIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { getRenderedMapViewForUser } = await import("./map-snapshots.server");
    return getRenderedMapViewForUser(context.viewer.user.id, data.mapId);
  });

export const saveRenderedMapViewFn = createServerFn({ method: "POST" })
  .middleware([requireViewerMiddleware])
  .inputValidator((input: z.infer<typeof saveRenderedMapViewInputSchema>) =>
    saveRenderedMapViewInputSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    const { saveRenderedMapViewForUser } = await import("./map-snapshots.server");
    return saveRenderedMapViewForUser(context.viewer.user.id, data.mapId, data.snapshot);
  });
