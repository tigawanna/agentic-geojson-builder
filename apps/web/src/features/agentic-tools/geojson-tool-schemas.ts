import { z } from "zod";

export const mapBaseMapStyleSchema = z.enum(["outline", "standard", "satellite"]);

export const mapIdInputSchema = z.object({
  mapId: z.number().int().positive(),
});

export const listMapsToolInputSchema = z.object({
  keyword: z.string().trim().optional(),
  cursor: z.string().optional(),
  direction: z.enum(["after", "before"]).optional(),
});

export const createMapToolInputSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
});

export const updateMapWorkspaceToolInputSchema = z.object({
  mapId: z.number().int().positive(),
  locationQuery: z.string().optional(),
  mapCenterLat: z.number().nullable().optional(),
  mapCenterLng: z.number().nullable().optional(),
  mapZoom: z.number().nullable().optional(),
  baseMapStyle: mapBaseMapStyleSchema.optional(),
  pdfScale: z.number().optional(),
  pdfRotation: z.number().optional(),
  pdfPanX: z.number().optional(),
  pdfPanY: z.number().optional(),
  pdfPageCount: z.number().int().positive().nullable().optional(),
  name: z.string().trim().min(1).max(255).optional(),
});

export const saveMapPdfToolInputSchema = z.object({
  mapId: z.number().int().positive(),
  fileName: z.string().trim().min(1),
  pdfBase64: z.string().min(1),
  pageCount: z.number().int().positive().nullable().optional(),
});

export const createControlPointToolInputSchema = z.object({
  mapId: z.number().int().positive(),
  imageX: z.number(),
  imageY: z.number(),
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  label: z.string().optional(),
});

export const updateControlPointToolInputSchema = z.object({
  mapId: z.number().int().positive(),
  controlPointId: z.number().int().positive(),
  imageX: z.number(),
  imageY: z.number(),
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
});

export const deleteControlPointToolInputSchema = z.object({
  mapId: z.number().int().positive(),
  controlPointId: z.number().int().positive(),
});

export const pdfPixelToolInputSchema = z.object({
  mapId: z.number().int().positive(),
  imageX: z.number(),
  imageY: z.number(),
});

export const lonLatToolInputSchema = z.object({
  mapId: z.number().int().positive(),
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
});

export const mapListItemSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  pdfFileName: z.string().nullable(),
  updatedAt: z.string(),
});

export const mapWorkspaceSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  locationQuery: z.string(),
  mapCenterLat: z.number().nullable(),
  mapCenterLng: z.number().nullable(),
  mapZoom: z.number().nullable(),
  baseMapStyle: mapBaseMapStyleSchema,
  pdfScale: z.number(),
  pdfRotation: z.number(),
  pdfPanX: z.number(),
  pdfPanY: z.number(),
  pdfFileName: z.string().nullable(),
  pdfPageCount: z.number().int().positive().nullable(),
  hasPdf: z.boolean(),
});

export const controlPointSchema = z.object({
  id: z.number().int().positive(),
  mapId: z.number().int().positive(),
  label: z.string().nullable(),
  imageX: z.number(),
  imageY: z.number(),
  longitude: z.number(),
  latitude: z.number(),
  createdAt: z.string(),
});

export const georeferenceReadySchema = z.object({
  mapId: z.number().int().positive(),
  ready: z.literal(true),
  method: z.literal("affine"),
  controlPointCount: z.number().int().nonnegative(),
  residualErrorMeters: z.number(),
  maxErrorMeters: z.number(),
  computedAt: z.string(),
  perPointErrors: z.array(
    z.object({
      controlPointId: z.number().int().positive(),
      errorMeters: z.number(),
    }),
  ),
});

export const georeferenceNotReadySchema = z.object({
  mapId: z.number().int().positive(),
  ready: z.literal(false),
  controlPointCount: z.number().int().nonnegative(),
  reason: z.enum(["insufficient_control_points", "singular_transform"]),
});

export const georeferenceSchema = z.discriminatedUnion("ready", [
  georeferenceReadySchema,
  georeferenceNotReadySchema,
]);

export const listMapsToolOutputSchema = z.object({
  items: z.array(mapListItemSchema),
  nextCursor: z.string().optional(),
  previousCursor: z.string().optional(),
});

export const getMapWorkspaceToolOutputSchema = z.object({
  map: mapWorkspaceSchema,
});

export const createMapToolOutputSchema = z.object({
  map: mapWorkspaceSchema,
});

export const updateMapWorkspaceToolOutputSchema = z.object({
  map: mapWorkspaceSchema,
});

export const saveMapPdfToolOutputSchema = z.object({
  map: mapWorkspaceSchema,
});

export const loadMapPdfToolOutputSchema = z.object({
  fileName: z.string(),
  pdfBase64: z.string(),
});

export const deleteMapToolOutputSchema = z.object({
  mapId: z.number().int().positive(),
  deleted: z.literal(true),
});

export const listControlPointsToolOutputSchema = z.object({
  controlPoints: z.array(controlPointSchema),
});

export const controlPointToolOutputSchema = z.object({
  controlPoint: controlPointSchema,
});

export const deleteControlPointToolOutputSchema = z.object({
  mapId: z.number().int().positive(),
  controlPointId: z.number().int().positive(),
  deleted: z.literal(true),
});

export const georeferenceToolOutputSchema = z.object({
  georeference: georeferenceSchema,
});

export const coordinateConversionOutputSchema = z.object({
  longitude: z.number(),
  latitude: z.number(),
});

export const pdfPixelConversionOutputSchema = z.object({
  imageX: z.number(),
  imageY: z.number(),
});

export const lineStringGeometrySchema = z.object({
  type: z.literal("LineString"),
  coordinates: z.array(z.tuple([z.number(), z.number()])).min(2),
});

export const pathKindSchema = z.enum([
  "bike-path",
  "dog-path",
  "walking-trail",
  "service-road",
  "boundary",
  "landmark",
  "unknown",
]);

export const segmentStatusSchema = z.enum(["draft", "needs-review", "accepted", "rejected"]);

export const geoSegmentSchema = z.object({
  id: z.number().int().positive(),
  mapId: z.number().int().positive(),
  segmentGroupId: z.string(),
  segmentIndex: z.number().int().nonnegative(),
  name: z.string().nullable(),
  pathKind: pathKindSchema,
  status: segmentStatusSchema,
  coordinateSpace: z.enum(["wgs84", "pdf-pixels"]),
  geometry: lineStringGeometrySchema,
  confidence: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const geoSegmentSummarySchema = z.object({
  id: z.number().int().positive(),
  segmentGroupId: z.string(),
  segmentIndex: z.number().int().nonnegative(),
  name: z.string().nullable(),
  pathKind: pathKindSchema,
  status: segmentStatusSchema,
  vertexCount: z.number().int().positive(),
});

export const listFeatureSegmentsToolOutputSchema = z.object({
  segments: z.array(geoSegmentSchema),
});

export const applyFeaturePatchToolInputSchema = z.object({
  mapId: z.number().int().positive(),
  op: z.enum(["upsert_segment", "delete_segment"]),
  segmentGroupId: z.string().trim().min(1).max(128),
  segmentIndex: z.number().int().nonnegative().optional(),
  segmentId: z.number().int().positive().optional(),
  name: z.string().trim().max(255).optional(),
  pathKind: pathKindSchema.optional(),
  status: segmentStatusSchema.optional(),
  coordinateSpace: z.enum(["wgs84", "pdf-pixels"]).optional(),
  geometry: lineStringGeometrySchema.optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const applyFeaturePatchToolOutputSchema = z.union([
  z.object({
    op: z.literal("upsert_segment"),
    segment: geoSegmentSchema,
  }),
  z.object({
    op: z.literal("delete_segment"),
    deleted: z.literal(true),
    segmentId: z.number().int().positive(),
  }),
]);

export const getProjectContextToolOutputSchema = z.object({
  map: mapWorkspaceSchema,
  controlPoints: z.array(controlPointSchema),
  georeference: georeferenceSchema,
  segments: z.array(geoSegmentSummarySchema),
});

export type ListMapsToolInput = z.infer<typeof listMapsToolInputSchema>;
export type CreateMapToolInput = z.infer<typeof createMapToolInputSchema>;
export type UpdateMapWorkspaceToolInput = z.infer<typeof updateMapWorkspaceToolInputSchema>;
export type SaveMapPdfToolInput = z.infer<typeof saveMapPdfToolInputSchema>;
export type CreateControlPointToolInput = z.infer<typeof createControlPointToolInputSchema>;
export type UpdateControlPointToolInput = z.infer<typeof updateControlPointToolInputSchema>;
export type DeleteControlPointToolInput = z.infer<typeof deleteControlPointToolInputSchema>;
export type PdfPixelToolInput = z.infer<typeof pdfPixelToolInputSchema>;
export type LonLatToolInput = z.infer<typeof lonLatToolInputSchema>;
export type ApplyFeaturePatchToolInput = z.infer<typeof applyFeaturePatchToolInputSchema>;
