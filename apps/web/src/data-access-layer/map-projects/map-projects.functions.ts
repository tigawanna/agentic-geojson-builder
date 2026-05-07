import { viewerMiddleware } from "@/data-access-layer/auth/viewer";
import {
  baseMapProviderSchema,
  latitudeSchema,
  longitudeSchema,
  pathKindSchema,
  sourceAssetTypeSchema,
} from "@repo/isomorphic/geojson-builder";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { z } from "zod";

export const createMapProjectInputSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(120),
  description: z.string().trim().max(500).optional(),
  locationHint: z.string().trim().max(160).optional(),
  defaultBaseMap: baseMapProviderSchema.default("leaflet-osm"),
});

export type CreateMapProjectInput = z.infer<typeof createMapProjectInputSchema>;

export const projectIdInputSchema = z.object({
  projectId: z.string().min(1),
});

export const updateMapProjectInputSchema = projectIdInputSchema.extend({
  name: z.string().trim().min(1, "Project name is required").max(120),
  description: z.string().trim().max(500).optional(),
  locationHint: z.string().trim().max(160).optional(),
  defaultBaseMap: baseMapProviderSchema.default("leaflet-osm"),
});

export const createSourceAssetInputSchema = projectIdInputSchema.extend({
  type: sourceAssetTypeSchema,
  fileName: z.string().trim().min(1).max(255),
  storageKey: z.string().trim().min(1).max(500),
  pageCount: z.number().int().positive().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
});

export const updateSourceAssetInputSchema = projectIdInputSchema.extend({
  sourceAssetId: z.string().min(1),
  fileName: z.string().trim().min(1).max(255),
  pageCount: z.number().int().positive().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
});

export const createControlPointInputSchema = projectIdInputSchema.extend({
  sourceAssetId: z.string().min(1),
  imageX: z.number(),
  imageY: z.number(),
  longitude: longitudeSchema,
  latitude: latitudeSchema,
  residualErrorMeters: z.number().min(0).optional(),
});

export const updateControlPointInputSchema = projectIdInputSchema.extend({
  controlPointId: z.string().min(1),
  imageX: z.number(),
  imageY: z.number(),
  longitude: longitudeSchema,
  latitude: latitudeSchema,
  residualErrorMeters: z.number().min(0).optional(),
});

export const createManualPointFeatureInputSchema = projectIdInputSchema.extend({
  sourceAssetId: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(160).optional(),
  pathKind: pathKindSchema.default("unknown"),
  longitude: longitudeSchema,
  latitude: latitudeSchema,
  notes: z.string().trim().max(500).optional(),
});

export const estimateAffineGeoreferenceInputSchema = projectIdInputSchema.extend({
  sourceAssetId: z.string().min(1),
});

export const deleteSourceAssetInputSchema = projectIdInputSchema.extend({
  sourceAssetId: z.string().min(1),
});

export const deleteControlPointInputSchema = projectIdInputSchema.extend({
  controlPointId: z.string().min(1),
});

export type ProjectIdInput = z.infer<typeof projectIdInputSchema>;
export type UpdateMapProjectInput = z.infer<typeof updateMapProjectInputSchema>;
export type CreateSourceAssetInput = z.infer<typeof createSourceAssetInputSchema>;
export type UpdateSourceAssetInput = z.infer<typeof updateSourceAssetInputSchema>;
export type CreateControlPointInput = z.infer<typeof createControlPointInputSchema>;
export type UpdateControlPointInput = z.infer<typeof updateControlPointInputSchema>;
export type CreateManualPointFeatureInput = z.infer<typeof createManualPointFeatureInputSchema>;
export type EstimateAffineGeoreferenceInput = z.infer<typeof estimateAffineGeoreferenceInputSchema>;
export type DeleteSourceAssetInput = z.infer<typeof deleteSourceAssetInputSchema>;
export type DeleteControlPointInput = z.infer<typeof deleteControlPointInputSchema>;

export const listMapProjectsFn = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .handler(async ({ context }) => {
    const { listMapProjectsForUser } = await import("./map-projects.server");
    return listMapProjectsForUser(context.viewer.user.id);
  });

export const createMapProjectFn = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: CreateMapProjectInput) => createMapProjectInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { createMapProjectForUser } = await import("./map-projects.server");
    return createMapProjectForUser(context.viewer.user.id, data);
  });

export const updateMapProjectFn = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: UpdateMapProjectInput) => updateMapProjectInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { updateMapProjectForUser } = await import("./map-projects.server");
    return updateMapProjectForUser(context.viewer.user.id, data.projectId, data);
  });

export const getMapProjectWorkspaceFn = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .inputValidator((input: ProjectIdInput) => projectIdInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { getMapProjectWorkspaceForUser } = await import("./map-projects.server");
    const workspace = await getMapProjectWorkspaceForUser(context.viewer.user.id, data.projectId);
    if (!workspace) {
      throw notFound();
    }
    return workspace;
  });

export const createSourceAssetFn = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: CreateSourceAssetInput) => createSourceAssetInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { createSourceAssetForUser } = await import("./map-projects.server");
    return createSourceAssetForUser(context.viewer.user.id, data.projectId, data);
  });

export const updateSourceAssetFn = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: UpdateSourceAssetInput) => updateSourceAssetInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { updateSourceAssetForUser } = await import("./map-projects.server");
    return updateSourceAssetForUser(context.viewer.user.id, data.projectId, data.sourceAssetId, data);
  });

export const createControlPointFn = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: CreateControlPointInput) => createControlPointInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { createControlPointForUser } = await import("./map-projects.server");
    return createControlPointForUser(context.viewer.user.id, data.projectId, data);
  });

export const updateControlPointFn = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: UpdateControlPointInput) => updateControlPointInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { updateControlPointForUser } = await import("./map-projects.server");
    return updateControlPointForUser(context.viewer.user.id, data.projectId, data.controlPointId, data);
  });

export const createManualPointFeatureFn = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: CreateManualPointFeatureInput) =>
    createManualPointFeatureInputSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    const { createManualPointFeatureForUser } = await import("./map-projects.server");
    return createManualPointFeatureForUser(context.viewer.user.id, data.projectId, data);
  });

export const estimateAffineGeoreferenceFn = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: EstimateAffineGeoreferenceInput) =>
    estimateAffineGeoreferenceInputSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    const { estimateAffineGeoreferenceForUser } = await import("./map-projects.server");
    return estimateAffineGeoreferenceForUser(context.viewer.user.id, data.projectId, data);
  });

export const deleteSourceAssetFn = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: DeleteSourceAssetInput) => deleteSourceAssetInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { deleteSourceAssetForUser } = await import("./map-projects.server");
    return deleteSourceAssetForUser(context.viewer.user.id, data.projectId, data.sourceAssetId);
  });

export const deleteControlPointFn = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: DeleteControlPointInput) => deleteControlPointInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { deleteControlPointForUser } = await import("./map-projects.server");
    return deleteControlPointForUser(context.viewer.user.id, data.projectId, data.controlPointId);
  });

export const deleteMapProjectFn = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .inputValidator((input: ProjectIdInput) => projectIdInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { deleteMapProjectForUser } = await import("./map-projects.server");
    return deleteMapProjectForUser(context.viewer.user.id, data.projectId);
  });
