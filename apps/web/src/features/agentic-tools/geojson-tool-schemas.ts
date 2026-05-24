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

export const segmentGroupSummarySchema = z.object({
  segmentGroupId: z.string(),
  segmentCount: z.number().int().nonnegative(),
  gapCount: z.number().int().nonnegative(),
});

export const segmentGapSchema = z.object({
  segmentGroupId: z.string(),
  afterSegmentIndex: z.number().int().nonnegative(),
  beforeSegmentIndex: z.number().int().nonnegative(),
  afterSegmentId: z.number().int().positive(),
  beforeSegmentId: z.number().int().positive(),
  gapMeters: z.number(),
  endCoord: z.tuple([z.number(), z.number()]),
  startCoord: z.tuple([z.number(), z.number()]),
});

export const findFeatureGapsToolInputSchema = z.object({
  mapId: z.number().int().positive(),
  segmentGroupId: z.string().trim().min(1).max(128).optional(),
  snapToleranceMeters: z.number().positive().optional(),
  statuses: z.array(segmentStatusSchema).optional(),
});

export const findFeatureGapsToolOutputSchema = z.object({
  mapId: z.number().int().positive(),
  snapToleranceMeters: z.number(),
  gapCount: z.number().int().nonnegative(),
  gaps: z.array(segmentGapSchema),
  groups: z.array(segmentGroupSummarySchema),
});

export const mergedSegmentSchema = z.object({
  segmentGroupId: z.string(),
  name: z.string().nullable(),
  pathKind: pathKindSchema,
  status: segmentStatusSchema,
  sourceSegmentIds: z.array(z.number().int().positive()),
  vertexCount: z.number().int().positive(),
  geometry: lineStringGeometrySchema,
});

export const mergeFeatureSegmentsToolInputSchema = z.object({
  mapId: z.number().int().positive(),
  segmentGroupId: z.string().trim().min(1).max(128).optional(),
  snapToleranceMeters: z.number().positive().optional(),
  statuses: z.array(segmentStatusSchema).optional(),
});

export const mergeFeatureSegmentsToolOutputSchema = z.object({
  mapId: z.number().int().positive(),
  snapToleranceMeters: z.number(),
  mergedCount: z.number().int().nonnegative(),
  merged: z.array(mergedSegmentSchema),
});

export const updateFeatureSegmentStatusToolInputSchema = z.object({
  mapId: z.number().int().positive(),
  segmentId: z.number().int().positive(),
  status: segmentStatusSchema,
});

export const updateFeatureSegmentStatusToolOutputSchema = z.object({
  segment: geoSegmentSchema,
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
  segmentGroups: z.array(segmentGroupSummarySchema),
  totalGapCount: z.number().int().nonnegative(),
});

export const exportedFeaturePropertiesSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  pathKind: pathKindSchema,
  source: z.literal("manual-trace"),
  status: segmentStatusSchema,
  confidence: z.number().optional(),
  segmentGroupId: z.string(),
  segmentIndex: z.number().int().nonnegative(),
  mapId: z.number().int().positive(),
  merged: z.boolean().optional(),
  sourceSegmentIds: z.array(z.number().int().positive()).optional(),
});

export const renderedMapViewPdfPaneSchema = z.object({
  imageBase64: z.string(),
  mimeType: z.literal("image/png"),
  canvasWidth: z.number().int().positive(),
  canvasHeight: z.number().int().positive(),
  coordinateSpace: z.literal("pdf-pixels"),
  origin: z.literal("top-left"),
  pdfRenderScale: z.number().positive(),
  viewTransform: z.object({
    scale: z.number(),
    rotation: z.number(),
    panX: z.number(),
    panY: z.number(),
  }),
  note: z.string(),
});

export const renderedMapViewMapPaneSchema = z.object({
  imageBase64: z.string(),
  mimeType: z.literal("image/png"),
  viewport: z.object({
    center: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }),
    zoom: z.number(),
    bounds: z.object({
      north: z.number(),
      south: z.number(),
      east: z.number(),
      west: z.number(),
    }),
  }),
  coordinateSpace: z.literal("wgs84"),
  baseMapStyle: mapBaseMapStyleSchema,
  containerWidth: z.number().int().positive(),
  containerHeight: z.number().int().positive(),
  captureMode: z.enum(["dom-screenshot", "tile-composite", "schematic-overlays"]),
});

export const renderedMapViewSchema = z.object({
  capturedAt: z.string(),
  mapId: z.number().int().positive(),
  source: z.enum(["client", "server"]),
  pdfPane: renderedMapViewPdfPaneSchema.nullable(),
  mapPane: renderedMapViewMapPaneSchema.nullable(),
  controlPointsVisible: z.boolean(),
  overlays: z.object({
    pendingMapPin: z
      .object({
        latitude: z.number(),
        longitude: z.number(),
      })
      .nullable(),
    draftSegmentsDrawn: z.boolean(),
  }),
});

export const getRenderedMapViewToolOutputSchema = z.object({
  mapId: z.number().int().positive(),
  ready: z.boolean(),
  reason: z.enum(["no_client_snapshot", "client_snapshot"]),
  message: z.string().optional(),
  capturedAt: z.string().optional(),
  snapshot: renderedMapViewSchema.nullable(),
});

export const exportedGeoJsonSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(
    z.object({
      type: z.literal("Feature"),
      id: z.number().int().positive(),
      geometry: lineStringGeometrySchema,
      properties: exportedFeaturePropertiesSchema,
    }),
  ),
});

export const exportGeoJsonToolInputSchema = z.object({
  mapId: z.number().int().positive(),
  segmentGroupId: z.string().trim().min(1).max(128).optional(),
  statuses: z.array(segmentStatusSchema).optional(),
  mergeGroups: z.boolean().optional(),
  snapToleranceMeters: z.number().positive().optional(),
});

export const exportGeoJsonToolOutputSchema = z.object({
  mapId: z.number().int().positive(),
  mapName: z.string().nullable(),
  featureCount: z.number().int().nonnegative(),
  geojson: exportedGeoJsonSchema,
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
export type FindFeatureGapsToolInput = z.infer<typeof findFeatureGapsToolInputSchema>;
export type MergeFeatureSegmentsToolInput = z.infer<typeof mergeFeatureSegmentsToolInputSchema>;
export type UpdateFeatureSegmentStatusToolInput = z.infer<
  typeof updateFeatureSegmentStatusToolInputSchema
>;
