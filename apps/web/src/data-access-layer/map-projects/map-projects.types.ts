import type { GeoFeatureProperties, GeoJsonGeometry } from "@repo/isomorphic/geojson-builder";
import type { ControlPoint, MapProject, SourceAsset } from "@repo/isomorphic/geojson-builder";

export type MapProjectListItem = MapProject & {
  sourceAssetCount: number;
  featureCount: number;
};

export type GeoFeatureListProperties = {
  id: string;
  name?: string;
  pathKind: GeoFeatureProperties["pathKind"];
  notes?: string;
  confidence?: number;
};

export type GeoFeatureListItem = {
  id: string;
  projectId: string;
  sourceAssetId?: string;
  agentRunId?: string;
  geometry: GeoJsonGeometry | null;
  properties: GeoFeatureListProperties;
  status: GeoFeatureProperties["status"];
  source: GeoFeatureProperties["source"];
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceFeatureCounts = Record<GeoFeatureProperties["status"], number>;

export type AffineGeoreferenceTransform = {
  pixelToLonLat: {
    longitude: [number, number, number];
    latitude: [number, number, number];
  };
  pointCount: number;
};

export type GeoreferenceListItem = {
  id: string;
  projectId: string;
  sourceAssetId: string;
  method: "unplaced" | "affine" | "projective";
  transform?: AffineGeoreferenceTransform;
  residualErrorMeters?: number;
  createdAt: string;
  updatedAt: string;
};

export type MapProjectWorkspace = {
  project: MapProject;
  sourceAssets: SourceAsset[];
  controlPoints: ControlPoint[];
  georeferences: GeoreferenceListItem[];
  features: GeoFeatureListItem[];
  featureCount: number;
  controlPointCount: number;
  featureCounts: WorkspaceFeatureCounts;
};
