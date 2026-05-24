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

const createControlPointInputSchema = z.object({
  mapId: z.number().int().positive(),
  imageX: z.number(),
  imageY: z.number(),
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  label: z.string().optional(),
});

const updateControlPointInputSchema = z.object({
  mapId: z.number().int().positive(),
  controlPointId: z.number().int().positive(),
  imageX: z.number(),
  imageY: z.number(),
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
});

const deleteControlPointInputSchema = z.object({
  mapId: z.number().int().positive(),
  controlPointId: z.number().int().positive(),
});

export const listControlPointsFn = createServerFn({ method: "GET" })
  .middleware([requireViewerMiddleware])
  .inputValidator((input: z.infer<typeof mapIdSchema>) => mapIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { listControlPointsForUser } = await import("./control-points.server");
    return listControlPointsForUser(context.viewer.user.id, data.mapId);
  });

export const createControlPointFn = createServerFn({ method: "POST" })
  .middleware([requireViewerMiddleware])
  .inputValidator((input: z.infer<typeof createControlPointInputSchema>) =>
    createControlPointInputSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    const { createControlPointForUser } = await import("./control-points.server");
    return createControlPointForUser(context.viewer.user.id, data);
  });

export const updateControlPointFn = createServerFn({ method: "POST" })
  .middleware([requireViewerMiddleware])
  .inputValidator((input: z.infer<typeof updateControlPointInputSchema>) =>
    updateControlPointInputSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    const { updateControlPointForUser } = await import("./control-points.server");
    return updateControlPointForUser(context.viewer.user.id, data);
  });

export const deleteControlPointFn = createServerFn({ method: "POST" })
  .middleware([requireViewerMiddleware])
  .inputValidator((input: z.infer<typeof deleteControlPointInputSchema>) =>
    deleteControlPointInputSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    const { deleteControlPointForUser } = await import("./control-points.server");
    await deleteControlPointForUser(context.viewer.user.id, data);
  });
