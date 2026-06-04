import { haversineDistanceMeters } from "@repo/isomorphic/nearest-line-point";

export type LineFractionResult = {
  fraction: number;
  distanceMeters: number;
  longitude: number;
  latitude: number;
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

export function projectPointFractionOnLine(
  longitude: number,
  latitude: number,
  coordinates: [number, number][],
): LineFractionResult | null {
  if (coordinates.length < 2) {
    return null;
  }

  const cumulativeLengths: number[] = [0];
  for (let i = 1; i < coordinates.length; i += 1) {
    const previous = coordinates[i - 1];
    const current = coordinates[i];
    if (!previous || !current) {
      continue;
    }
    const segmentLength = haversineDistanceMeters(previous[1], previous[0], current[1], current[0]);
    cumulativeLengths.push((cumulativeLengths[i - 1] ?? 0) + segmentLength);
  }

  const totalLength = cumulativeLengths.at(-1) ?? 0;
  if (totalLength <= 0) {
    return null;
  }

  let best: LineFractionResult | null = null;

  for (let i = 0; i < coordinates.length - 1; i += 1) {
    const start = coordinates[i];
    const end = coordinates[i + 1];
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

    const segmentStartLength = cumulativeLengths[i] ?? 0;
    const segmentLength = (cumulativeLengths[i + 1] ?? 0) - segmentStartLength;
    const alongLength = segmentStartLength + projected.t * segmentLength;

    best = {
      fraction: Math.max(0, Math.min(1, alongLength / totalLength)),
      distanceMeters,
      longitude: projected.lng,
      latitude: projected.lat,
    };
  }

  return best;
}

function buildCumulativeLengths(coordinates: [number, number][]): number[] {
  const cumulativeLengths: number[] = [0];
  for (let i = 1; i < coordinates.length; i += 1) {
    const previous = coordinates[i - 1];
    const current = coordinates[i];
    if (!previous || !current) {
      continue;
    }
    const segmentLength = haversineDistanceMeters(previous[1], previous[0], current[1], current[0]);
    cumulativeLengths.push((cumulativeLengths[i - 1] ?? 0) + segmentLength);
  }
  return cumulativeLengths;
}

export function pathLengthMeters(coordinates: [number, number][]): number {
  const cumulative = buildCumulativeLengths(coordinates);
  return cumulative.at(-1) ?? 0;
}

export function coordinateAtFraction(
  coordinates: [number, number][],
  fraction: number,
): [number, number] | null {
  if (coordinates.length < 2) {
    return null;
  }

  const clamped = Math.max(0, Math.min(1, fraction));
  const cumulativeLengths = buildCumulativeLengths(coordinates);
  const totalLength = cumulativeLengths.at(-1) ?? 0;
  if (totalLength <= 0) {
    return coordinates[0] ?? null;
  }

  const targetLength = clamped * totalLength;

  for (let i = 0; i < coordinates.length - 1; i += 1) {
    const start = coordinates[i];
    const end = coordinates[i + 1];
    if (!start || !end) {
      continue;
    }

    const segmentStart = cumulativeLengths[i] ?? 0;
    const segmentEnd = cumulativeLengths[i + 1] ?? segmentStart;
    if (targetLength > segmentEnd) {
      continue;
    }

    const segmentLength = segmentEnd - segmentStart;
    const t = segmentLength <= 0 ? 0 : (targetLength - segmentStart) / segmentLength;
    return [start[0] + t * (end[0] - start[0]), start[1] + t * (end[1] - start[1])];
  }

  return coordinates.at(-1) ?? null;
}

export function sliceLineBetweenFractions(
  coordinates: [number, number][],
  startFraction: number,
  endFraction: number,
): [number, number][] {
  if (coordinates.length < 2) {
    return [];
  }

  const start = Math.max(0, Math.min(1, Math.min(startFraction, endFraction)));
  const end = Math.max(0, Math.min(1, Math.max(startFraction, endFraction)));
  const startCoord = coordinateAtFraction(coordinates, start);
  const endCoord = coordinateAtFraction(coordinates, end);

  if (!startCoord || !endCoord) {
    return [];
  }

  const cumulativeLengths = buildCumulativeLengths(coordinates);
  const totalLength = cumulativeLengths.at(-1) ?? 0;
  if (totalLength <= 0) {
    return [startCoord, endCoord];
  }

  const startLength = start * totalLength;
  const endLength = end * totalLength;
  const sliced: [number, number][] = [startCoord];

  for (let i = 0; i < coordinates.length - 1; i += 1) {
    const segmentStart = cumulativeLengths[i] ?? 0;
    const segmentEnd = cumulativeLengths[i + 1] ?? segmentStart;
    if (segmentEnd <= startLength || segmentStart >= endLength) {
      continue;
    }

    const vertex = coordinates[i + 1];
    if (!vertex) {
      continue;
    }

    const last = sliced.at(-1);
    if (last && last[0] === vertex[0] && last[1] === vertex[1]) {
      continue;
    }
    sliced.push(vertex);
  }

  const last = sliced.at(-1);
  if (!last || last[0] !== endCoord[0] || last[1] !== endCoord[1]) {
    sliced.push(endCoord);
  }

  return sliced.length >= 2 ? sliced : [startCoord, endCoord];
}

export function combineGroupCoordinates(
  segments: Array<{ segmentIndex: number; geometry: { coordinates: [number, number][] } }>,
): [number, number][] {
  const ordered = [...segments].sort((a, b) => a.segmentIndex - b.segmentIndex);
  const combined: [number, number][] = [];

  for (const segment of ordered) {
    for (const coordinate of segment.geometry.coordinates) {
      const last = combined.at(-1);
      if (last && last[0] === coordinate[0] && last[1] === coordinate[1]) {
        continue;
      }
      combined.push(coordinate);
    }
  }

  return combined;
}
