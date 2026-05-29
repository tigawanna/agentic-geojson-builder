export type ReferenceLineInput = {
  id: string;
  name: string;
  coordinates: [number, number][];
};

export type ComputeIntersectionsInput = {
  lines: ReferenceLineInput[];
  deduplicateToleranceMeters?: number;
};

export type IntersectionResult = {
  longitude: number;
  latitude: number;
  lineA: { id: string; name: string; segmentIndex: number };
  lineB: { id: string; name: string; segmentIndex: number };
  label: string;
};

export type ComputeIntersectionsResult = {
  intersectionCount: number;
  intersections: IntersectionResult[];
};

export type SnapPointInput = {
  latitude: number;
  longitude: number;
  guides: ReferenceLineInput[];
  toleranceMeters?: number;
};

export type SnapPointResult =
  | {
      snapped: true;
      latitude: number;
      longitude: number;
      distanceMeters: number;
      snappedTo: {
        lineId: string;
        lineName: string;
        segmentIndex: number;
        type: "vertex" | "edge";
      };
    }
  | {
      snapped: false;
      latitude: number;
      longitude: number;
    };

export type SnapTraceInput = {
  coordinates: [number, number][];
  guides: ReferenceLineInput[];
  toleranceMeters?: number;
  endpointsOnly?: boolean;
};

export type SnapTraceResult = {
  snapToleranceMeters: number;
  coordinates: [number, number][];
  snappedCount: number;
  totalCount: number;
  snapDetails: Array<{
    coordinateIndex: number;
    longitude: number;
    latitude: number;
    distanceMeters: number;
    snappedTo: {
      lineId: string;
      lineName: string;
      segmentIndex: number;
      type: "vertex" | "edge";
    };
  }>;
};
