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

const createMapInputSchema = z.object({
  name: z.string().trim().min(1).optional(),
});

const listMapsInputSchema = z.object({
  keyword: z.string().optional(),
  cursor: z.string().optional(),
  direction: z.enum(["after", "before"]).optional(),
});

const updateMapWorkspaceInputSchema = z.object({
  mapId: z.number().int().positive(),
  locationQuery: z.string().optional(),
  mapCenterLat: z.number().nullable().optional(),
  mapCenterLng: z.number().nullable().optional(),
  mapZoom: z.number().nullable().optional(),
  baseMapStyle: z.enum(["outline", "standard", "satellite"]).optional(),
  pdfScale: z.number().optional(),
  pdfRotation: z.number().optional(),
  pdfPanX: z.number().optional(),
  pdfPanY: z.number().optional(),
  pdfPageCount: z.number().int().positive().nullable().optional(),
  name: z.string().trim().min(1).optional(),
});

const saveMapPdfInputSchema = z.object({
  mapId: z.number().int().positive(),
  fileName: z.string().trim().min(1),
  pdfBase64: z.string().min(1),
  pageCount: z.number().int().positive().nullable().optional(),
});

export const listMapsFn = createServerFn({ method: "GET" })
  .middleware([requireViewerMiddleware])
  .inputValidator((input: z.infer<typeof listMapsInputSchema>) => listMapsInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { listMapsForUserPaginated } = await import("./maps.server");
    return listMapsForUserPaginated(context.viewer.user.id, data);
  });

export const getMapWorkspaceFn = createServerFn({ method: "GET" })
  .middleware([requireViewerMiddleware])
  .inputValidator((input: z.infer<typeof mapIdSchema>) => mapIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { getMapWorkspaceForUser } = await import("./maps.server");
    return getMapWorkspaceForUser(context.viewer.user.id, data.mapId);
  });

export const createMapFn = createServerFn({ method: "POST" })
  .middleware([requireViewerMiddleware])
  .inputValidator((input: z.infer<typeof createMapInputSchema>) =>
    createMapInputSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    const { createMapForUser } = await import("./maps.server");
    return createMapForUser(context.viewer.user.id, data.name);
  });

export const updateMapWorkspaceFn = createServerFn({ method: "POST" })
  .middleware([requireViewerMiddleware])
  .inputValidator((input: z.infer<typeof updateMapWorkspaceInputSchema>) =>
    updateMapWorkspaceInputSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    const { updateMapWorkspaceForUser } = await import("./maps.server");
    return updateMapWorkspaceForUser(context.viewer.user.id, data);
  });

export const deleteMapFn = createServerFn({ method: "POST" })
  .middleware([requireViewerMiddleware])
  .inputValidator((input: z.infer<typeof mapIdSchema>) => mapIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { deleteMapForUser } = await import("./maps.server");
    await deleteMapForUser(context.viewer.user.id, data.mapId);
  });

export const saveMapPdfFn = createServerFn({ method: "POST" })
  .middleware([requireViewerMiddleware])
  .inputValidator((input: z.infer<typeof saveMapPdfInputSchema>) =>
    saveMapPdfInputSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    const { saveMapPdfForUser } = await import("./maps.server");
    return saveMapPdfForUser(context.viewer.user.id, data);
  });

export const loadMapPdfFn = createServerFn({ method: "GET" })
  .middleware([requireViewerMiddleware])
  .inputValidator((input: z.infer<typeof mapIdSchema>) => mapIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { loadMapPdfForUser } = await import("./maps.server");
    return loadMapPdfForUser(context.viewer.user.id, data.mapId);
  });
