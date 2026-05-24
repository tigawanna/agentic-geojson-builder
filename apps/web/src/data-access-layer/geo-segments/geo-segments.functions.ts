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

const lineStringGeometrySchema = z.object({
  type: z.literal("LineString"),
  coordinates: z.array(z.tuple([z.number(), z.number()])).min(2),
});

const pathKindSchema = z.enum([
  "bike-path",
  "dog-path",
  "walking-trail",
  "service-road",
  "boundary",
  "landmark",
  "unknown",
]);

const segmentStatusSchema = z.enum(["draft", "needs-review", "accepted", "rejected"]);

const createGeoSegmentInputSchema = z.object({
  mapId: z.number().int().positive(),
  segmentGroupId: z.string().trim().min(1).max(128),
  segmentIndex: z.number().int().nonnegative().optional(),
  name: z.string().trim().max(255).optional(),
  pathKind: pathKindSchema.optional(),
  geometry: lineStringGeometrySchema,
});

const deleteGeoSegmentInputSchema = z.object({
  mapId: z.number().int().positive(),
  segmentId: z.number().int().positive(),
});

const updateGeoSegmentInputSchema = z.object({
  mapId: z.number().int().positive(),
  segmentId: z.number().int().positive(),
  segmentGroupId: z.string().trim().min(1).max(128).optional(),
  name: z.string().trim().max(255).optional(),
  pathKind: pathKindSchema.optional(),
  geometry: lineStringGeometrySchema,
});

const exportGeoJsonInputSchema = z.object({
  mapId: z.number().int().positive(),
  segmentGroupId: z.string().trim().min(1).max(128).optional(),
  statuses: z.array(segmentStatusSchema).optional(),
});

export const listGeoSegmentsFn = createServerFn({ method: "GET" })
  .middleware([requireViewerMiddleware])
  .inputValidator((input: z.infer<typeof mapIdSchema>) => mapIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { listGeoSegmentsForUser } = await import("./geo-segments.server");
    return listGeoSegmentsForUser(context.viewer.user.id, data.mapId);
  });

export const createGeoSegmentFn = createServerFn({ method: "POST" })
  .middleware([requireViewerMiddleware])
  .inputValidator((input: z.infer<typeof createGeoSegmentInputSchema>) =>
    createGeoSegmentInputSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    const { createGeoSegmentForUser } = await import("./geo-segments.server");
    return createGeoSegmentForUser(context.viewer.user.id, {
      ...data,
      coordinateSpace: "wgs84",
      status: "draft",
    });
  });

export const deleteGeoSegmentFn = createServerFn({ method: "POST" })
  .middleware([requireViewerMiddleware])
  .inputValidator((input: z.infer<typeof deleteGeoSegmentInputSchema>) =>
    deleteGeoSegmentInputSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    const { deleteGeoSegmentForUser } = await import("./geo-segments.server");
    await deleteGeoSegmentForUser(context.viewer.user.id, data.mapId, data.segmentId);
  });

export const updateGeoSegmentFn = createServerFn({ method: "POST" })
  .middleware([requireViewerMiddleware])
  .inputValidator((input: z.infer<typeof updateGeoSegmentInputSchema>) =>
    updateGeoSegmentInputSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    const { updateGeoSegmentForUser } = await import("./geo-segments.server");
    return updateGeoSegmentForUser(context.viewer.user.id, data);
  });

export const exportGeoJsonFn = createServerFn({ method: "POST" })
  .middleware([requireViewerMiddleware])
  .inputValidator((input: z.infer<typeof exportGeoJsonInputSchema>) =>
    exportGeoJsonInputSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    const { exportGeoJsonForUser } = await import("./geo-segments.server");
    return exportGeoJsonForUser(context.viewer.user.id, data);
  });
