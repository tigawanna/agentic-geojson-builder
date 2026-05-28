export type StoredLineStringGeometry = {
  type: "LineString";
  coordinates: [number, number][];
};

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

export const GEO_SEGMENT_PATH_KINDS: GeoSegmentPathKind[] = [
  "walking-trail",
  "bike-path",
  "dog-path",
  "service-road",
  "boundary",
  "landmark",
  "unknown",
];

export type GeoSegmentRecord = {
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

export type DeleteGeoSegmentInput = {
  mapId: number;
  segmentId: number;
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

export type UpdateGeoSegmentStatusInput = {
  mapId: number;
  segmentId: number;
  status: GeoSegmentStatus;
};

export type FindFeatureGapsInput = {
  mapId: number;
  segmentGroupId?: string;
  snapToleranceMeters?: number;
  statuses?: GeoSegmentStatus[];
};

export type MergeFeatureSegmentsInput = {
  mapId: number;
  segmentGroupId?: string;
  snapToleranceMeters?: number;
  statuses?: GeoSegmentStatus[];
};

export type GeoSegmentsChangedEvent = {
  mapId: number;
  reason: "created" | "updated" | "deleted" | "status-updated";
  segmentId?: number;
};
