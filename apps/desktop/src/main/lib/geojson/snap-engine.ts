import { haversineDistanceMeters } from "@main/lib/georeference/affine.js";
import type { LineStringCoordinates, NamedLineString } from "./intersection-solver.js";

export type SnapTarget = {
  longitude: number;
  latitude: number;
  distanceMeters: number;
  snappedTo: {
    lineId: string;
    lineName: string;
    segmentIndex: number;
    type: "vertex" | "edge";
  };
};

export type SnapResult =
  | { snapped: true; original: [number, number]; target: SnapTarget }
  | { snapped: false; original: [number, number] };

export type TraceSnapResult = {
  snapToleranceMeters: number;
  coordinates: [number, number][];
  snappedCount: number;
  snapDetails: Array<{
    coordinateIndex: number;
    target: SnapTarget;
  }>;
};

const DEFAULT_SNAP_TOLERANCE_METERS = 20;

function projectPointOntoSegment(
  pointLat: number,
  pointLng: number,
  segStartLat: number,
  segStartLng: number,
  segEndLat: number,
  segEndLng: number,
): { latitude: number; longitude: number; t: number } {
  const deltaLat = segEndLat - segStartLat;
  const deltaLng = segEndLng - segStartLng;
  const lengthSquared = deltaLat * deltaLat + deltaLng * deltaLng;

  if (lengthSquared < 1e-18) {
    return { latitude: segStartLat, longitude: segStartLng, t: 0 };
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((pointLat - segStartLat) * deltaLat + (pointLng - segStartLng) * deltaLng) / lengthSquared,
    ),
  );

  return {
    latitude: segStartLat + t * deltaLat,
    longitude: segStartLng + t * deltaLng,
    t,
  };
}

function findNearestPointOnLine(
  latitude: number,
  longitude: number,
  line: NamedLineString,
  toleranceMeters: number,
): SnapTarget | null {
  let best: SnapTarget | null = null;
  const coords = line.coordinates;

  for (let i = 0; i < coords.length; i += 1) {
    const vertex = coords[i];
    if (!vertex) continue;

    const dist = haversineDistanceMeters(latitude, longitude, vertex[1], vertex[0]);
    if (dist < toleranceMeters && (!best || dist < best.distanceMeters)) {
      best = {
        longitude: vertex[0],
        latitude: vertex[1],
        distanceMeters: dist,
        snappedTo: {
          lineId: line.id,
          lineName: line.name,
          segmentIndex: i,
          type: "vertex",
        },
      };
    }
  }

  for (let i = 0; i < coords.length - 1; i += 1) {
    const start = coords[i];
    const end = coords[i + 1];
    if (!start || !end) continue;

    const projected = projectPointOntoSegment(
      latitude,
      longitude,
      start[1],
      start[0],
      end[1],
      end[0],
    );

    if (projected.t <= 0 || projected.t >= 1) continue;

    const dist = haversineDistanceMeters(
      latitude,
      longitude,
      projected.latitude,
      projected.longitude,
    );

    if (dist < toleranceMeters && (!best || dist < best.distanceMeters)) {
      best = {
        longitude: projected.longitude,
        latitude: projected.latitude,
        distanceMeters: dist,
        snappedTo: {
          lineId: line.id,
          lineName: line.name,
          segmentIndex: i,
          type: "edge",
        },
      };
    }
  }

  return best;
}

export function snapToGuides(
  latitude: number,
  longitude: number,
  guides: NamedLineString[],
  toleranceMeters: number = DEFAULT_SNAP_TOLERANCE_METERS,
): SnapResult {
  let best: SnapTarget | null = null;

  for (const guide of guides) {
    const candidate = findNearestPointOnLine(latitude, longitude, guide, toleranceMeters);
    if (candidate && (!best || candidate.distanceMeters < best.distanceMeters)) {
      best = candidate;
    }
  }

  if (best) {
    return {
      snapped: true,
      original: [longitude, latitude],
      target: best,
    };
  }

  return { snapped: false, original: [longitude, latitude] };
}

export function snapTraceCoordinates(
  coordinates: LineStringCoordinates,
  guides: NamedLineString[],
  options?: {
    snapToleranceMeters?: number;
    endpointsOnly?: boolean;
  },
): TraceSnapResult {
  const toleranceMeters = options?.snapToleranceMeters ?? DEFAULT_SNAP_TOLERANCE_METERS;
  const endpointsOnly = options?.endpointsOnly ?? false;
  const result: [number, number][] = [];
  const snapDetails: TraceSnapResult["snapDetails"] = [];

  for (let i = 0; i < coordinates.length; i += 1) {
    const coord = coordinates[i];
    if (!coord) {
      result.push(coord ?? [0, 0]);
      continue;
    }

    const isEndpoint = i === 0 || i === coordinates.length - 1;
    if (endpointsOnly && !isEndpoint) {
      result.push(coord);
      continue;
    }

    const snapResult = snapToGuides(coord[1], coord[0], guides, toleranceMeters);

    if (snapResult.snapped) {
      result.push([snapResult.target.longitude, snapResult.target.latitude]);
      snapDetails.push({ coordinateIndex: i, target: snapResult.target });
    } else {
      result.push(coord);
    }
  }

  return {
    snapToleranceMeters: toleranceMeters,
    coordinates: result,
    snappedCount: snapDetails.length,
    snapDetails,
  };
}

export function findNearestGuidePoint(
  latitude: number,
  longitude: number,
  guides: NamedLineString[],
  maxDistanceMeters: number = 100,
): SnapTarget | null {
  let best: SnapTarget | null = null;

  for (const guide of guides) {
    const candidate = findNearestPointOnLine(latitude, longitude, guide, maxDistanceMeters);
    if (candidate && (!best || candidate.distanceMeters < best.distanceMeters)) {
      best = candidate;
    }
  }

  return best;
}
