import type { GeoFeatureProperties, GeoJsonGeometry } from "@repo/isomorphic/geojson-builder";
import { relations, sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";

const timestampMs = (name: string) =>
  integer(name, { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull();

export type AffineGeoreferenceTransform = {
  pixelToLonLat: {
    longitude: [number, number, number];
    latitude: [number, number, number];
  };
  pointCount: number;
};

export const mapProject = sqliteTable(
  "map_project",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    locationHint: text("location_hint"),
    defaultBaseMap: text("default_base_map", {
      enum: ["leaflet-osm", "google-roadmap", "google-satellite"],
    })
      .default("leaflet-osm")
      .notNull(),
    createdAt: timestampMs("created_at"),
    updatedAt: timestampMs("updated_at").$onUpdate(() => new Date()),
  },
  (table) => [
    index("map_project_ownerId_idx").on(table.ownerId),
    index("map_project_updatedAt_idx").on(table.updatedAt),
  ],
);

export const sourceAsset = sqliteTable(
  "source_asset",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => mapProject.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["pdf", "image"] }).notNull(),
    fileName: text("file_name").notNull(),
    storageKey: text("storage_key").notNull(),
    pageCount: integer("page_count"),
    width: real("width"),
    height: real("height"),
    createdAt: timestampMs("created_at"),
  },
  (table) => [
    index("source_asset_projectId_idx").on(table.projectId),
    index("source_asset_createdAt_idx").on(table.createdAt),
  ],
);

export const controlPoint = sqliteTable(
  "control_point",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => mapProject.id, { onDelete: "cascade" }),
    sourceAssetId: text("source_asset_id")
      .notNull()
      .references(() => sourceAsset.id, { onDelete: "cascade" }),
    imageX: real("image_x").notNull(),
    imageY: real("image_y").notNull(),
    longitude: real("longitude").notNull(),
    latitude: real("latitude").notNull(),
    residualErrorMeters: real("residual_error_meters"),
    createdAt: timestampMs("created_at"),
  },
  (table) => [
    index("control_point_projectId_idx").on(table.projectId),
    index("control_point_sourceAssetId_idx").on(table.sourceAssetId),
  ],
);

export const georeference = sqliteTable(
  "georeference",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => mapProject.id, { onDelete: "cascade" }),
    sourceAssetId: text("source_asset_id")
      .notNull()
      .references(() => sourceAsset.id, { onDelete: "cascade" }),
    method: text("method", { enum: ["unplaced", "affine", "projective"] })
      .default("unplaced")
      .notNull(),
    transform: text("transform", { mode: "json" }).$type<AffineGeoreferenceTransform>(),
    residualErrorMeters: real("residual_error_meters"),
    createdAt: timestampMs("created_at"),
    updatedAt: timestampMs("updated_at").$onUpdate(() => new Date()),
  },
  (table) => [
    index("georeference_projectId_idx").on(table.projectId),
    index("georeference_sourceAssetId_idx").on(table.sourceAssetId),
  ],
);

export const geoFeature = sqliteTable(
  "geo_feature",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => mapProject.id, { onDelete: "cascade" }),
    sourceAssetId: text("source_asset_id").references(() => sourceAsset.id, {
      onDelete: "set null",
    }),
    agentRunId: text("agent_run_id"),
    geometry: text("geometry", { mode: "json" }).$type<GeoJsonGeometry | null>(),
    properties: text("properties", { mode: "json" }).$type<GeoFeatureProperties>().notNull(),
    status: text("status", { enum: ["draft", "needs-review", "accepted", "rejected"] })
      .default("draft")
      .notNull(),
    source: text("source", {
      enum: ["manual-trace", "agent-proposal", "geojson-import", "source-map-label"],
    }).notNull(),
    createdAt: timestampMs("created_at"),
    updatedAt: timestampMs("updated_at").$onUpdate(() => new Date()),
  },
  (table) => [
    index("geo_feature_projectId_idx").on(table.projectId),
    index("geo_feature_status_idx").on(table.status),
    index("geo_feature_sourceAssetId_idx").on(table.sourceAssetId),
  ],
);

export const agentRun = sqliteTable(
  "agent_run",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => mapProject.id, { onDelete: "cascade" }),
    toolName: text("tool_name", {
      enum: [
        "get_project_context",
        "get_rendered_map_view",
        "propose_features_from_overlay",
        "validate_geojson_features",
        "apply_feature_patch",
        "explain_feature",
      ],
    }).notNull(),
    model: text("model"),
    status: text("status", { enum: ["queued", "running", "completed", "failed"] })
      .default("queued")
      .notNull(),
    summary: text("summary"),
    createdAt: timestampMs("created_at"),
    updatedAt: timestampMs("updated_at").$onUpdate(() => new Date()),
  },
  (table) => [
    index("agent_run_projectId_idx").on(table.projectId),
    index("agent_run_status_idx").on(table.status),
  ],
);

export const projectRevision = sqliteTable(
  "project_revision",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => mapProject.id, { onDelete: "cascade" }),
    parentRevisionId: text("parent_revision_id"),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    agentRunId: text("agent_run_id").references(() => agentRun.id, { onDelete: "set null" }),
    label: text("label").notNull(),
    featureCollection: text("feature_collection", { mode: "json" }).notNull(),
    createdAt: timestampMs("created_at"),
  },
  (table) => [
    index("project_revision_projectId_idx").on(table.projectId),
    index("project_revision_createdAt_idx").on(table.createdAt),
  ],
);

export const mapProjectRelations = relations(mapProject, ({ one, many }) => ({
  owner: one(user, {
    fields: [mapProject.ownerId],
    references: [user.id],
  }),
  sourceAssets: many(sourceAsset),
  controlPoints: many(controlPoint),
  georeferences: many(georeference),
  features: many(geoFeature),
  agentRuns: many(agentRun),
  revisions: many(projectRevision),
}));

export const sourceAssetRelations = relations(sourceAsset, ({ one, many }) => ({
  project: one(mapProject, {
    fields: [sourceAsset.projectId],
    references: [mapProject.id],
  }),
  controlPoints: many(controlPoint),
  georeferences: many(georeference),
  features: many(geoFeature),
}));

export const controlPointRelations = relations(controlPoint, ({ one }) => ({
  project: one(mapProject, {
    fields: [controlPoint.projectId],
    references: [mapProject.id],
  }),
  sourceAsset: one(sourceAsset, {
    fields: [controlPoint.sourceAssetId],
    references: [sourceAsset.id],
  }),
}));

export const georeferenceRelations = relations(georeference, ({ one }) => ({
  project: one(mapProject, {
    fields: [georeference.projectId],
    references: [mapProject.id],
  }),
  sourceAsset: one(sourceAsset, {
    fields: [georeference.sourceAssetId],
    references: [sourceAsset.id],
  }),
}));

export const geoFeatureRelations = relations(geoFeature, ({ one }) => ({
  project: one(mapProject, {
    fields: [geoFeature.projectId],
    references: [mapProject.id],
  }),
  sourceAsset: one(sourceAsset, {
    fields: [geoFeature.sourceAssetId],
    references: [sourceAsset.id],
  }),
}));

export const agentRunRelations = relations(agentRun, ({ one, many }) => ({
  project: one(mapProject, {
    fields: [agentRun.projectId],
    references: [mapProject.id],
  }),
  revisions: many(projectRevision),
}));

export const projectRevisionRelations = relations(projectRevision, ({ one }) => ({
  project: one(mapProject, {
    fields: [projectRevision.projectId],
    references: [mapProject.id],
  }),
  createdByUser: one(user, {
    fields: [projectRevision.createdByUserId],
    references: [user.id],
  }),
  agentRun: one(agentRun, {
    fields: [projectRevision.agentRunId],
    references: [agentRun.id],
  }),
}));
