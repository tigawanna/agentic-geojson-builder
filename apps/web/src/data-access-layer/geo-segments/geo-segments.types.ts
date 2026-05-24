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
