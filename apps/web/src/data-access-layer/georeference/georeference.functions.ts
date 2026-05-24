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

const pdfPixelInputSchema = z.object({
  mapId: z.number().int().positive(),
  imageX: z.number(),
  imageY: z.number(),
});

const lonLatInputSchema = z.object({
  mapId: z.number().int().positive(),
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
});

export const getGeoreferenceFn = createServerFn({ method: "GET" })
  .middleware([requireViewerMiddleware])
  .inputValidator((input: z.infer<typeof mapIdSchema>) => mapIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { getGeoreferenceForUser } = await import("./georeference.server");
    return getGeoreferenceForUser(context.viewer.user.id, data.mapId);
  });

export const computeGeoreferenceFn = createServerFn({ method: "POST" })
  .middleware([requireViewerMiddleware])
  .inputValidator((input: z.infer<typeof mapIdSchema>) => mapIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { computeGeoreferenceForUser } = await import("./georeference.server");
    return computeGeoreferenceForUser(context.viewer.user.id, data.mapId);
  });

export const pdfPixelToLonLatFn = createServerFn({ method: "POST" })
  .middleware([requireViewerMiddleware])
  .inputValidator((input: z.infer<typeof pdfPixelInputSchema>) => pdfPixelInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { pdfPixelToLonLatForUser } = await import("./georeference.server");
    return pdfPixelToLonLatForUser(context.viewer.user.id, data);
  });

export const lonLatToPdfPixelFn = createServerFn({ method: "POST" })
  .middleware([requireViewerMiddleware])
  .inputValidator((input: z.infer<typeof lonLatInputSchema>) => lonLatInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { lonLatToPdfPixelForUser } = await import("./georeference.server");
    return lonLatToPdfPixelForUser(context.viewer.user.id, data);
  });
