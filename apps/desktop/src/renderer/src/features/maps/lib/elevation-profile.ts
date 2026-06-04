import { getElevationAtLatLng, type GeoCoordinate } from "@repo/isomorphic/elevation-at-point";

export type ElevationProfilePoint = {
  distanceM: number;
  elevationM: number;
};

export type ElevationProfileSummary = {
  points: ElevationProfilePoint[];
  minM: number;
  maxM: number;
};

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadiusM = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function buildElevationProfileFromCoordinates(
  coordinates: Array<{ latitude: number; longitude: number }>,
): ElevationProfileSummary | null {
  if (coordinates.length === 0) {
    return null;
  }

  const geoCoordinates: GeoCoordinate[] = coordinates.map((coordinate) => [
    coordinate.longitude,
    coordinate.latitude,
  ]);

  const maxSamples = 48;
  const step = Math.max(1, Math.floor(coordinates.length / maxSamples));
  const sampledIndices: number[] = [];
  for (let index = 0; index < coordinates.length; index += step) {
    sampledIndices.push(index);
  }
  const lastIndex = coordinates.length - 1;
  if (sampledIndices[sampledIndices.length - 1] !== lastIndex) {
    sampledIndices.push(lastIndex);
  }

  const points: ElevationProfilePoint[] = [];
  let distanceM = 0;

  for (let sampleIndex = 0; sampleIndex < sampledIndices.length; sampleIndex += 1) {
    const coordinateIndex = sampledIndices[sampleIndex]!;
    const coordinate = coordinates[coordinateIndex]!;
    if (sampleIndex > 0) {
      const previousIndex = sampledIndices[sampleIndex - 1]!;
      const previous = coordinates[previousIndex]!;
      distanceM += haversineMeters(
        previous.latitude,
        previous.longitude,
        coordinate.latitude,
        coordinate.longitude,
      );
    }
    const elevationM = getElevationAtLatLng(
      geoCoordinates,
      coordinate.latitude,
      coordinate.longitude,
    );
    if (elevationM === null) {
      continue;
    }
    points.push({ distanceM, elevationM });
  }

  if (points.length < 2) {
    return null;
  }

  const elevations = points.map((point) => point.elevationM);
  return {
    points,
    minM: Math.min(...elevations),
    maxM: Math.max(...elevations),
  };
}
