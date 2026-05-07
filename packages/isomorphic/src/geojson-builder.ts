import { z } from "zod";

export const longitudeSchema = z.number().min(-180).max(180);
export const latitudeSchema = z.number().min(-90).max(90);
export const altitudeSchema = z.number();

export const position2dSchema = z.tuple([longitudeSchema, latitudeSchema]);
export const position3dSchema = z.tuple([longitudeSchema, latitudeSchema, altitudeSchema]);
export const positionSchema = z.union([position2dSchema, position3dSchema]);
export const bboxSchema = z.union([
  z.tuple([longitudeSchema, latitudeSchema, longitudeSchema, latitudeSchema]),
  z.tuple([
    longitudeSchema,
    latitudeSchema,
    altitudeSchema,
    longitudeSchema,
    latitudeSchema,
    altitudeSchema,
  ]),
]);

const geoJsonBaseSchema = z.object({
  bbox: bboxSchema.optional(),
});

export const pointGeometrySchema = geoJsonBaseSchema.extend({
  type: z.literal("Point"),
  coordinates: positionSchema,
});

export const multiPointGeometrySchema = geoJsonBaseSchema.extend({
  type: z.literal("MultiPoint"),
  coordinates: z.array(positionSchema),
});

export const lineStringGeometrySchema = geoJsonBaseSchema.extend({
  type: z.literal("LineString"),
  coordinates: z.array(positionSchema).min(2),
});

export const multiLineStringGeometrySchema = geoJsonBaseSchema.extend({
  type: z.literal("MultiLineString"),
  coordinates: z.array(z.array(positionSchema).min(2)),
});

export const linearRingSchema = z.array(positionSchema).min(4);

export const polygonGeometrySchema = geoJsonBaseSchema.extend({
  type: z.literal("Polygon"),
  coordinates: z.array(linearRingSchema).min(1),
});

export const multiPolygonGeometrySchema = geoJsonBaseSchema.extend({
  type: z.literal("MultiPolygon"),
  coordinates: z.array(z.array(linearRingSchema).min(1)),
});

const nonCollectionGeometrySchemas = [
  pointGeometrySchema,
  multiPointGeometrySchema,
  lineStringGeometrySchema,
  multiLineStringGeometrySchema,
  polygonGeometrySchema,
  multiPolygonGeometrySchema,
] as const;

export const geometryCollectionSchema = geoJsonBaseSchema.extend({
  type: z.literal("GeometryCollection"),
  geometries: z.array(z.discriminatedUnion("type", nonCollectionGeometrySchemas)),
});

export const geoJsonGeometrySchema = z.discriminatedUnion("type", [
  ...nonCollectionGeometrySchemas,
  geometryCollectionSchema,
]);

export const featureStatusSchema = z.enum(["draft", "needs-review", "accepted", "rejected"]);
export const featureSourceSchema = z.enum([
  "manual-trace",
  "agent-proposal",
  "geojson-import",
  "source-map-label",
]);
export const pathKindSchema = z.enum([
  "bike-path",
  "dog-path",
  "walking-trail",
  "service-road",
  "boundary",
  "landmark",
  "unknown",
]);

export const geoFeaturePropertiesSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).optional(),
    pathKind: pathKindSchema.default("unknown"),
    source: featureSourceSchema,
    status: featureStatusSchema.default("draft"),
    confidence: z.number().min(0).max(1).optional(),
    notes: z.string().optional(),
    sourceAssetId: z.string().min(1).optional(),
    agentRunId: z.string().min(1).optional(),
  })
  .catchall(z.unknown());

export const geoFeatureSchema = geoJsonBaseSchema.extend({
  type: z.literal("Feature"),
  id: z.union([z.string(), z.number()]).optional(),
  geometry: geoJsonGeometrySchema.nullable(),
  properties: geoFeaturePropertiesSchema,
});

export const geoFeatureCollectionSchema = geoJsonBaseSchema.extend({
  type: z.literal("FeatureCollection"),
  features: z.array(geoFeatureSchema),
});

export const sourceAssetTypeSchema = z.enum(["pdf", "image"]);
export const baseMapProviderSchema = z.enum(["leaflet-osm", "google-roadmap", "google-satellite"]);
export const transformMethodSchema = z.enum(["unplaced", "affine", "projective"]);

export const sourceAssetSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  type: sourceAssetTypeSchema,
  fileName: z.string().min(1),
  storageKey: z.string().min(1),
  pageCount: z.number().int().positive().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  createdAt: z.iso.datetime(),
});

export const controlPointSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  sourceAssetId: z.string().min(1),
  imageX: z.number(),
  imageY: z.number(),
  longitude: longitudeSchema,
  latitude: latitudeSchema,
  residualErrorMeters: z.number().min(0).optional(),
});

export const georeferenceSchema = z.object({
  projectId: z.string().min(1),
  sourceAssetId: z.string().min(1),
  method: transformMethodSchema.default("unplaced"),
  controlPoints: z.array(controlPointSchema),
  residualErrorMeters: z.number().min(0).optional(),
});

export const mapProjectSchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  locationHint: z.string().optional(),
  defaultBaseMap: baseMapProviderSchema.default("leaflet-osm"),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const agentToolNameSchema = z.enum([
  "get_project_context",
  "get_rendered_map_view",
  "propose_features_from_overlay",
  "validate_geojson_features",
  "apply_feature_patch",
  "explain_feature",
]);

export const agentRunSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  toolName: agentToolNameSchema,
  model: z.string().min(1).optional(),
  status: z.enum(["queued", "running", "completed", "failed"]),
  summary: z.string().optional(),
  createdAt: z.iso.datetime(),
});

export type Position = z.infer<typeof positionSchema>;
export type GeoJsonGeometry = z.infer<typeof geoJsonGeometrySchema>;
export type GeoFeatureProperties = z.infer<typeof geoFeaturePropertiesSchema>;
export type GeoFeature = z.infer<typeof geoFeatureSchema>;
export type GeoFeatureCollection = z.infer<typeof geoFeatureCollectionSchema>;
export type SourceAsset = z.infer<typeof sourceAssetSchema>;
export type ControlPoint = z.infer<typeof controlPointSchema>;
export type Georeference = z.infer<typeof georeferenceSchema>;
export type MapProject = z.infer<typeof mapProjectSchema>;
export type AgentRun = z.infer<typeof agentRunSchema>;
