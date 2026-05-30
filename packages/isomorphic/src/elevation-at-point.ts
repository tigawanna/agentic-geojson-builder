export type GeoCoordinate = [number, number] | [number, number, number];

function readCoordinateElevation(coordinate: GeoCoordinate): number | null {
  if (coordinate.length < 3) {
    return null;
  }
  const elevation = coordinate[2];
  return typeof elevation === "number" && Number.isFinite(elevation) ? elevation : null;
}

function projectOntoSegment(
  latitude: number,
  longitude: number,
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const deltaLat = latitudeB - latitudeA;
  const deltaLng = longitudeB - longitudeA;
  const lengthSquared = deltaLat * deltaLat + deltaLng * deltaLng;
  if (lengthSquared === 0) {
    return 0;
  }
  const projection =
    ((latitude - latitudeA) * deltaLat + (longitude - longitudeA) * deltaLng) / lengthSquared;
  return Math.max(0, Math.min(1, projection));
}

export function getElevationAtLatLng(
  coordinates: GeoCoordinate[],
  latitude: number,
  longitude: number,
): number | null {
  if (coordinates.length < 2) {
    return null;
  }

  let closestDistanceSquared = Number.POSITIVE_INFINITY;
  let closestElevation: number | null = null;

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const start = coordinates[index];
    const end = coordinates[index + 1];
    if (!start || !end) {
      continue;
    }

    const startLatitude = start[1];
    const startLongitude = start[0];
    const endLatitude = end[1];
    const endLongitude = end[0];
    const startElevation = readCoordinateElevation(start);
    const endElevation = readCoordinateElevation(end);
    const projection = projectOntoSegment(
      latitude,
      longitude,
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
    );
    const projectedLatitude = startLatitude + projection * (endLatitude - startLatitude);
    const projectedLongitude = startLongitude + projection * (endLongitude - startLongitude);
    const distanceSquared =
      (latitude - projectedLatitude) ** 2 + (longitude - projectedLongitude) ** 2;

    if (distanceSquared >= closestDistanceSquared) {
      continue;
    }

    closestDistanceSquared = distanceSquared;

    if (startElevation !== null && endElevation !== null) {
      closestElevation = startElevation + projection * (endElevation - startElevation);
    } else if (startElevation !== null && endElevation === null) {
      closestElevation = startElevation;
    } else if (endElevation !== null && startElevation === null) {
      closestElevation = endElevation;
    } else {
      closestElevation = null;
    }
  }

  return closestElevation;
}
