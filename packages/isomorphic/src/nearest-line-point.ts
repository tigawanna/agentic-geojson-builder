import type { GeoCoordinate } from "./elevation-at-point.js";

const EARTH_RADIUS_METERS = 6_371_000;

export type LineGuide = {
  id: string;
  name: string;
  coordinates: GeoCoordinate[];
};

export type NearestLinePointResult = {
  lineId: string;
  lineName: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  segmentIndex: number;
  snapType: "vertex" | "edge";
  coordinates: GeoCoordinate[];
};

export function haversineDistanceMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(latitudeB - latitudeA);
  const deltaLng = toRadians(longitudeB - longitudeA);
  const lat1 = toRadians(latitudeA);
  const lat2 = toRadians(latitudeB);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
}

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
  line: LineGuide,
): Omit<NearestLinePointResult, "coordinates"> | null {
  let best: Omit<NearestLinePointResult, "coordinates"> | null = null;
  const coords = line.coordinates;

  for (let i = 0; i < coords.length; i += 1) {
    const vertex = coords[i];
    if (!vertex) continue;

    const dist = haversineDistanceMeters(latitude, longitude, vertex[1], vertex[0]);
    if (!best || dist < best.distanceMeters) {
      best = {
        lineId: line.id,
        lineName: line.name,
        longitude: vertex[0],
        latitude: vertex[1],
        distanceMeters: dist,
        segmentIndex: i,
        snapType: "vertex",
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

    if (!best || dist < best.distanceMeters) {
      best = {
        lineId: line.id,
        lineName: line.name,
        longitude: projected.longitude,
        latitude: projected.latitude,
        distanceMeters: dist,
        segmentIndex: i,
        snapType: "edge",
      };
    }
  }

  return best;
}

export function findNearestPointOnGuides(
  latitude: number,
  longitude: number,
  guides: LineGuide[],
): NearestLinePointResult | null {
  let best: NearestLinePointResult | null = null;

  for (const guide of guides) {
    if (guide.coordinates.length < 2) {
      continue;
    }

    const candidate = findNearestPointOnLine(latitude, longitude, guide);
    if (!candidate || (best && candidate.distanceMeters >= best.distanceMeters)) {
      continue;
    }

    best = {
      ...candidate,
      coordinates: guide.coordinates,
    };
  }

  return best;
}
