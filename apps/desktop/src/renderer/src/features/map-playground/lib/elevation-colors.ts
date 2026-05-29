import { getFeatureKey } from "@renderer/features/map-playground/lib/parse-playground-geojson";
import type { PlaygroundCoordinate, PlaygroundLayer } from "@renderer/types/map-playground.types";

export type ElevationRange = {
  min: number;
  max: number;
};

export type ElevationSegment = {
  latlngs: Array<{ lat: number; lng: number }>;
  color: string;
};

function readCoordinateElevation(coordinate: PlaygroundCoordinate): number | null {
  if (coordinate.length < 3) {
    return null;
  }
  const elevation = coordinate[2];
  return typeof elevation === "number" && Number.isFinite(elevation) ? elevation : null;
}

function isFeatureVisible(layer: PlaygroundLayer, featureKey: string) {
  return layer.visible && !layer.hiddenFeatureKeys.includes(featureKey);
}

export function collectVisibleElevations(layers: PlaygroundLayer[]) {
  const elevations: number[] = [];

  for (const layer of layers) {
    for (const feature of layer.features) {
      const featureKey = getFeatureKey(feature);
      if (!isFeatureVisible(layer, featureKey)) {
        continue;
      }

      for (const coordinate of feature.geometry.coordinates) {
        const elevation = readCoordinateElevation(coordinate);
        if (elevation !== null) {
          elevations.push(elevation);
        }
      }
    }
  }

  return elevations;
}

export function computeVisibleElevationRange(layers: PlaygroundLayer[]): ElevationRange | null {
  const elevations = collectVisibleElevations(layers);
  if (elevations.length === 0) {
    return null;
  }

  return {
    min: Math.min(...elevations),
    max: Math.max(...elevations),
  };
}

function interpolateChannel(start: number, end: number, ratio: number) {
  return Math.round(start + (end - start) * ratio);
}

function interpolateHexColor(startHex: string, endHex: string, ratio: number) {
  const parseChannel = (hex: string, startIndex: number) =>
    Number.parseInt(hex.slice(startIndex, startIndex + 2), 16);

  const red = interpolateChannel(parseChannel(startHex, 1), parseChannel(endHex, 1), ratio);
  const green = interpolateChannel(parseChannel(startHex, 3), parseChannel(endHex, 3), ratio);
  const blue = interpolateChannel(parseChannel(startHex, 5), parseChannel(endHex, 5), ratio);

  return `#${red.toString(16).padStart(2, "0")}${green.toString(16).padStart(2, "0")}${blue.toString(16).padStart(2, "0")}`;
}

export function elevationRatio(elevation: number, range: ElevationRange) {
  if (range.max === range.min) {
    return 0.5;
  }
  return (elevation - range.min) / (range.max - range.min);
}

export function colorForElevation(elevation: number, range: ElevationRange) {
  const ratio = elevationRatio(elevation, range);
  if (ratio <= 0.5) {
    return interpolateHexColor("#22c55e", "#eab308", ratio / 0.5);
  }
  return interpolateHexColor("#eab308", "#ef4444", (ratio - 0.5) / 0.5);
}

export function buildElevationSegments(
  coordinates: PlaygroundCoordinate[],
  range: ElevationRange,
): ElevationSegment[] {
  const segments: ElevationSegment[] = [];

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const start = coordinates[index];
    const end = coordinates[index + 1];
    if (!start || !end) {
      continue;
    }

    const startElevation = readCoordinateElevation(start);
    const endElevation = readCoordinateElevation(end);
    if (startElevation === null && endElevation === null) {
      continue;
    }

    const elevation =
      startElevation !== null && endElevation !== null
        ? (startElevation + endElevation) / 2
        : (startElevation ?? endElevation ?? range.min);

    segments.push({
      latlngs: [
        { lat: start[1], lng: start[0] },
        { lat: end[1], lng: end[0] },
      ],
      color: colorForElevation(elevation, range),
    });
  }

  return segments;
}

export function featureHasElevationData(coordinates: PlaygroundCoordinate[]) {
  return coordinates.some((coordinate) => readCoordinateElevation(coordinate) !== null);
}

export const ELEVATION_GRADIENT_STOPS = ["#22c55e", "#eab308", "#ef4444"] as const;
