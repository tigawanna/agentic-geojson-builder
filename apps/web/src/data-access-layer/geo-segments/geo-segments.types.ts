import type { StoredLineStringGeometry } from "@/lib/drizzle/schema/maps/geo-segment.schema";

export type GeoSegmentCoordinateSpace = "wgs84" | "pdf-pixels";
export type GeoSegmentStatus = "draft" | "needs-review" | "accepted" | "rejected";
export type GeoSegmentPathKind =
  | "bike-path"
  | "dog-path"
  | "walking-trail"
  | "service-road"
  | "boundary"
  | "landmark"
  | "unknown";

export type GeoSegmentViewModel = {
  id: number;
  mapId: number;
  segmentGroupId: string;
  segmentIndex: number;
  name: string | null;
  pathKind: GeoSegmentPathKind;
  status: GeoSegmentStatus;
  coordinateSpace: GeoSegmentCoordinateSpace;
  geometry: StoredLineStringGeometry;
  confidence: number | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateGeoSegmentInput = {
  mapId: number;
  segmentGroupId: string;
  segmentIndex?: number;
  name?: string;
  pathKind?: GeoSegmentPathKind;
  status?: GeoSegmentStatus;
  coordinateSpace?: GeoSegmentCoordinateSpace;
  geometry: StoredLineStringGeometry;
  confidence?: number;
};

export type UpdateGeoSegmentInput = {
  mapId: number;
  segmentId: number;
  segmentGroupId?: string;
  name?: string;
  pathKind?: GeoSegmentPathKind;
  geometry: StoredLineStringGeometry;
};

export type ExportGeoJsonInput = {
  mapId: number;
  segmentGroupId?: string;
  statuses?: GeoSegmentStatus[];
  mergeGroups?: boolean;
  snapToleranceMeters?: number;
};

export type ExportGeoJsonResult = {
  mapId: number;
  mapName: string | null;
  featureCount: number;
  geojson: {
    type: "FeatureCollection";
    features: Array<{
      type: "Feature";
      id: number;
      geometry: StoredLineStringGeometry;
      properties: {
        id: string;
        name?: string;
        pathKind: GeoSegmentPathKind;
        source: "manual-trace";
        status: GeoSegmentStatus;
        confidence?: number;
        segmentGroupId: string;
        segmentIndex: number;
        mapId: number;
        merged?: boolean;
        sourceSegmentIds?: number[];
      };
    }>;
  };
};

export type ApplyFeaturePatchInput = {
  mapId: number;
  op: "upsert_segment" | "delete_segment";
  segmentGroupId: string;
  segmentIndex?: number;
  segmentId?: number;
  name?: string;
  pathKind?: GeoSegmentPathKind;
  status?: GeoSegmentStatus;
  coordinateSpace?: GeoSegmentCoordinateSpace;
  geometry?: StoredLineStringGeometry;
  confidence?: number;
};
