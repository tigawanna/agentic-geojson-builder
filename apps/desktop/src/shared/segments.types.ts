import type {
  GeoSegmentPathKind,
  GeoSegmentStatus,
  StoredLineStringGeometry,
} from "@shared/geo-segments.types.js";

export type SegmentEdgeMetadata = Record<string, string>;

export type SegmentEdgeRecord = {
  id: number;
  mapId: number;
  fromRef: string;
  toRef: string;
  pathSlug: string;
  startFraction: number | null;
  endFraction: number | null;
  geometry: StoredLineStringGeometry | null;
  lengthM: number | null;
  kind: GeoSegmentPathKind;
  bidirectional: boolean;
  status: GeoSegmentStatus;
  metadata: SegmentEdgeMetadata;
  createdAt: string;
  updatedAt: string;
};

export type CreateSegmentEdgeInput = {
  mapId: number;
  fromRef: string;
  toRef: string;
  pathSlug: string;
  startFraction?: number | null;
  endFraction?: number | null;
  geometry?: StoredLineStringGeometry | null;
  lengthM?: number | null;
  kind?: GeoSegmentPathKind;
  bidirectional?: boolean;
  status?: GeoSegmentStatus;
  metadata?: SegmentEdgeMetadata;
};

export type CreateSegmentEdgeFromPointsInput = {
  mapId: number;
  fromPointId: number;
  toPointId: number;
  pathSlug?: string;
  bidirectional?: boolean;
};

export type CreateSegmentEdgeChainFromPointsInput = {
  mapId: number;
  pointIds: number[];
  pathSlug?: string;
  bidirectional?: boolean;
};

export type CreateSegmentEdgeChainFromPointsResult = {
  segments: SegmentEdgeRecord[];
};

export type UpdateSegmentEdgeInput = {
  mapId: number;
  segmentId: number;
  pathSlug?: string;
  startFraction?: number | null;
  endFraction?: number | null;
  geometry?: StoredLineStringGeometry | null;
  lengthM?: number | null;
  kind?: GeoSegmentPathKind;
  bidirectional?: boolean;
  status?: GeoSegmentStatus;
  metadata?: SegmentEdgeMetadata;
};

export type DeleteSegmentEdgeInput = {
  mapId: number;
  segmentId: number;
};

export type BuildSegmentsFromPathInput = {
  mapId: number;
  pathSlug: string;
  replaceExisting?: boolean;
  maxProjectionDistanceMeters?: number;
};

export type BuildSegmentsFromPathPreview = {
  pathSlug: string;
  proposed: Array<{
    fromRef: string;
    toRef: string;
    startFraction: number;
    endFraction: number;
    geometry: StoredLineStringGeometry;
    lengthM: number;
  }>;
  skippedMarkers: Array<{ ref: string; reason: string }>;
};

export type BuildSegmentsFromPathResult = {
  pathSlug: string;
  created: SegmentEdgeRecord[];
  deletedCount: number;
};

export type SegmentsChangedEvent = {
  mapId: number;
  reason: "created" | "updated" | "deleted" | "built";
  segmentId?: number;
};

export type MapLinkRecord = SegmentEdgeRecord;

export type CreateMapLinkInput = CreateSegmentEdgeInput;
export type CreateMapLinkFromPointsInput = CreateSegmentEdgeFromPointsInput;

export type UpdateMapLinkInput = Omit<UpdateSegmentEdgeInput, "segmentId"> & {
  linkId: number;
};

export type DeleteMapLinkInput = {
  mapId: number;
  linkId: number;
};

export type MapLinksChangedEvent = SegmentsChangedEvent;
