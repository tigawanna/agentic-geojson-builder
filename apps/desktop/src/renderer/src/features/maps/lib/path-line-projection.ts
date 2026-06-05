import { haversineDistanceMeters } from "@repo/isomorphic/nearest-line-point";

export type PathLineProjection = {
  fraction: number;
  distanceMeters: number;
};

function projectOntoSegment(
  pointLng: number,
  pointLat: number,
  startLng: number,
  startLat: number,
  endLng: number,
  endLat: number,
): { lng: number; lat: number; t: number } {
  const deltaLng = endLng - startLng;
  const deltaLat = endLat - startLat;
  const lengthSquared = deltaLng * deltaLng + deltaLat * deltaLat;

  if (lengthSquared < 1e-18) {
    return { lng: startLng, lat: startLat, t: 0 };
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((pointLng - startLng) * deltaLng + (pointLat - startLat) * deltaLat) / lengthSquared,
    ),
  );

  return {
    lng: startLng + t * deltaLng,
    lat: startLat + t * deltaLat,
    t,
  };
}

export function projectPointFractionOnPath(
  longitude: number,
  latitude: number,
  coordinates: [number, number][],
): PathLineProjection | null {
  if (coordinates.length < 2) {
    return null;
  }

  const cumulativeLengths: number[] = [0];
  for (let index = 1; index < coordinates.length; index += 1) {
    const previous = coordinates[index - 1];
    const current = coordinates[index];
    if (!previous || !current) {
      continue;
    }
    const segmentLength = haversineDistanceMeters(previous[1], previous[0], current[1], current[0]);
    cumulativeLengths.push((cumulativeLengths[index - 1] ?? 0) + segmentLength);
  }

  const totalLength = cumulativeLengths.at(-1) ?? 0;
  if (totalLength <= 0) {
    return null;
  }

  let best: PathLineProjection | null = null;

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const start = coordinates[index];
    const end = coordinates[index + 1];
    if (!start || !end) {
      continue;
    }

    const projected = projectOntoSegment(longitude, latitude, start[0], start[1], end[0], end[1]);
    const distanceMeters = haversineDistanceMeters(
      latitude,
      longitude,
      projected.lat,
      projected.lng,
    );

    if (best && distanceMeters >= best.distanceMeters) {
      continue;
    }

    const segmentStartLength = cumulativeLengths[index] ?? 0;
    const segmentLength = (cumulativeLengths[index + 1] ?? 0) - segmentStartLength;
    const alongLength = segmentStartLength + projected.t * segmentLength;

    best = {
      fraction: Math.max(0, Math.min(1, alongLength / totalLength)),
      distanceMeters,
    };
  }

  return best;
}
