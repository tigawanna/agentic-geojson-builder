import { haversineDistanceMeters } from "@main/lib/georeference/affine.js";

export type LineStringCoordinates = [number, number][];

export type IntersectionPoint = {
  longitude: number;
  latitude: number;
  lineAIndex: number;
  lineBIndex: number;
  lineASegmentIndex: number;
  lineBSegmentIndex: number;
};

export type NamedLineString = {
  id: string;
  name: string;
  coordinates: LineStringCoordinates;
};

export type NamedIntersection = {
  longitude: number;
  latitude: number;
  lineA: { id: string; name: string; segmentIndex: number };
  lineB: { id: string; name: string; segmentIndex: number };
  label: string;
};

type Coord = [number, number];

function segmentIntersection(a1: Coord, a2: Coord, b1: Coord, b2: Coord): Coord | null {
  const d1x = a2[0] - a1[0];
  const d1y = a2[1] - a1[1];
  const d2x = b2[0] - b1[0];
  const d2y = b2[1] - b1[1];

  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-12) {
    return null;
  }

  const dx = b1[0] - a1[0];
  const dy = b1[1] - a1[1];
  const t = (dx * d2y - dy * d2x) / denom;
  const u = (dx * d1y - dy * d1x) / denom;

  if (t < 0 || t > 1 || u < 0 || u > 1) {
    return null;
  }

  return [a1[0] + t * d1x, a1[1] + t * d1y];
}

export function findLineStringIntersections(
  lineA: LineStringCoordinates,
  lineB: LineStringCoordinates,
): IntersectionPoint[] {
  const results: IntersectionPoint[] = [];

  for (let i = 0; i < lineA.length - 1; i += 1) {
    const a1 = lineA[i];
    const a2 = lineA[i + 1];
    if (!a1 || !a2) continue;

    for (let j = 0; j < lineB.length - 1; j += 1) {
      const b1 = lineB[j];
      const b2 = lineB[j + 1];
      if (!b1 || !b2) continue;

      const point = segmentIntersection(a1, a2, b1, b2);
      if (point) {
        results.push({
          longitude: point[0],
          latitude: point[1],
          lineAIndex: 0,
          lineBIndex: 0,
          lineASegmentIndex: i,
          lineBSegmentIndex: j,
        });
      }
    }
  }

  return results;
}

function deduplicateIntersections(
  points: NamedIntersection[],
  toleranceMeters: number,
): NamedIntersection[] {
  const deduplicated: NamedIntersection[] = [];

  for (const point of points) {
    const isDuplicate = deduplicated.some(
      (existing) =>
        haversineDistanceMeters(
          existing.latitude,
          existing.longitude,
          point.latitude,
          point.longitude,
        ) < toleranceMeters,
    );

    if (!isDuplicate) {
      deduplicated.push(point);
    }
  }

  return deduplicated;
}

export function computeAllIntersections(
  lines: NamedLineString[],
  options?: { deduplicateToleranceMeters?: number },
): NamedIntersection[] {
  const toleranceMeters = options?.deduplicateToleranceMeters ?? 5;
  const results: NamedIntersection[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    for (let j = i + 1; j < lines.length; j += 1) {
      const lineA = lines[i];
      const lineB = lines[j];
      if (!lineA || !lineB) continue;

      const intersections = findLineStringIntersections(lineA.coordinates, lineB.coordinates);

      for (const point of intersections) {
        results.push({
          longitude: point.longitude,
          latitude: point.latitude,
          lineA: {
            id: lineA.id,
            name: lineA.name,
            segmentIndex: point.lineASegmentIndex,
          },
          lineB: {
            id: lineB.id,
            name: lineB.name,
            segmentIndex: point.lineBSegmentIndex,
          },
          label: `${lineA.name} × ${lineB.name}`,
        });
      }
    }
  }

  return deduplicateIntersections(results, toleranceMeters);
}

export function findNearestIntersection(
  latitude: number,
  longitude: number,
  intersections: NamedIntersection[],
  toleranceMeters: number = 50,
): (NamedIntersection & { distanceMeters: number }) | null {
  let nearest: (NamedIntersection & { distanceMeters: number }) | null = null;

  for (const intersection of intersections) {
    const distance = haversineDistanceMeters(
      latitude,
      longitude,
      intersection.latitude,
      intersection.longitude,
    );

    if (distance > toleranceMeters) continue;

    if (!nearest || distance < nearest.distanceMeters) {
      nearest = { ...intersection, distanceMeters: distance };
    }
  }

  return nearest;
}
