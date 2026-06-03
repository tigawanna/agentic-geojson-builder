import type { GeoSegmentPathKind, GeoSegmentStatus } from "./geo-segments.types.js";
import type { MapPointCategory } from "./map-points.types.js";

export type BundleLineStringFeature = {
  type: "Feature";
  geometry: { type: "LineString"; coordinates: number[][] };
  properties: {
    slug: string;
    name: string | null;
    pathKind: GeoSegmentPathKind;
    [key: string]: unknown;
  };
};

export type BundlePointFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: number[] };
  properties: {
    ref: string | null;
    name: string | null;
    category: MapPointCategory;
    elevation?: number;
    elevationSource?: string;
    [key: string]: unknown;
  };
};

export type BundleLink = {
  fromRef: string;
  toRef: string;
  pathSlug: string;
  startFraction?: number;
  endFraction?: number;
  bidirectional: boolean;
};

export type RoutingBundle = {
  version: 2;
  generatedAt: string;
  mapId: number;
  mapName: string | null;
  bbox?: [number, number, number, number];
  fractionsProvided: boolean;
  paths: { type: "FeatureCollection"; features: BundleLineStringFeature[] };
  points: { type: "FeatureCollection"; features: BundlePointFeature[] };
  links: BundleLink[];
};

export type CombinedGeoJson = {
  type: "FeatureCollection";
  features: Array<BundleLineStringFeature | BundlePointFeature>;
};

export type BundleValidationSeverity = "error" | "warning";

export type BundleValidationIssue = {
  code:
    | "duplicate_ref"
    | "point_far_from_path"
    | "junction_single_link"
    | "dangling_link_ref"
    | "link_unknown_path"
    | "missing_ref_routing_point";
  severity: BundleValidationSeverity;
  message: string;
  ref?: string | null;
  pointId?: number;
  linkId?: number;
};

export type BundleValidationReport = {
  issues: BundleValidationIssue[];
  errorCount: number;
  warningCount: number;
};

export type BuildBundleInput = {
  mapId: number;
  includePaths?: boolean;
  includePoints?: boolean;
  includeLinks?: boolean;
  mergePathGroups?: boolean;
  pathStatuses?: GeoSegmentStatus[];
  pointCategories?: MapPointCategory[];
};

export type BuildBundleResult = {
  bundle: RoutingBundle;
  combined: CombinedGeoJson;
  validation: BundleValidationReport;
};

export type BundleExportFormat = "bundle" | "points" | "paths" | "links" | "combined";

export type ExportBundleToFileInput = BuildBundleInput & {
  format: BundleExportFormat;
};

export type ExportBundleToFileResult =
  | { canceled: true }
  | { canceled: false; savedPath: string; featureCount: number };
