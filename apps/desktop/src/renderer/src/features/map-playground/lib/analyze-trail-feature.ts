import { getFeatureKey } from "@renderer/features/map-playground/lib/parse-playground-geojson";
import type {
  PlaygroundCoordinate,
  PlaygroundElevationStats,
  PlaygroundFeature,
  PlaygroundTrailStats,
} from "@renderer/types/map-playground.types";

const EARTH_RADIUS_METERS = 6371000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseNumeric(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function haversineMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const lat1 = (latitudeA * Math.PI) / 180;
  const lat2 = (latitudeB * Math.PI) / 180;
  const deltaLat = ((latitudeB - latitudeA) * Math.PI) / 180;
  const deltaLng = ((longitudeB - longitudeA) * Math.PI) / 180;
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

function computePathLengthMeters(coordinates: PlaygroundCoordinate[]) {
  if (coordinates.length < 2) {
    return null;
  }

  let total = 0;
  for (let index = 1; index < coordinates.length; index += 1) {
    const previous = coordinates[index - 1];
    const current = coordinates[index];
    if (!previous || !current) {
      continue;
    }
    const [lngA, latA] = previous;
    const [lngB, latB] = current;
    total += haversineMeters(latA, lngA, latB, lngB);
  }

  return total;
}

function computeElevationStats(coordinates: PlaygroundCoordinate[]): PlaygroundElevationStats {
  const elevations = coordinates
    .map((coordinate) => (coordinate.length >= 3 ? coordinate[2] : null))
    .filter((value): value is number => value !== null && Number.isFinite(value));

  if (elevations.length === 0) {
    return {
      min: null,
      max: null,
      gain: null,
      loss: null,
      sampleCount: 0,
    };
  }

  let gain = 0;
  let loss = 0;
  for (let index = 1; index < elevations.length; index += 1) {
    const previous = elevations[index - 1];
    const current = elevations[index];
    if (previous === undefined || current === undefined) {
      continue;
    }
    const delta = current - previous;
    if (delta > 0) {
      gain += delta;
    } else {
      loss += Math.abs(delta);
    }
  }

  return {
    min: Math.min(...elevations),
    max: Math.max(...elevations),
    gain,
    loss,
    sampleCount: elevations.length,
  };
}

function readTrailforkProperties(properties: Record<string, unknown>) {
  const trailfork = isRecord(properties.trailfork) ? properties.trailfork : null;
  const sources = isRecord(properties.sources) ? properties.sources : null;
  const osmTagsRaw = trailfork?.osmTags;
  const osmTags: Record<string, string> = {};

  if (isRecord(osmTagsRaw)) {
    for (const [key, value] of Object.entries(osmTagsRaw)) {
      if (typeof value === "string") {
        osmTags[key] = value;
      } else if (typeof value === "number" && Number.isFinite(value)) {
        osmTags[key] = String(value);
      }
    }
  }

  return {
    trailforkId:
      parseNumeric(properties.trailforkId) ??
      parseNumeric(trailfork?.trailforkId) ??
      parseNumeric(trailfork?.trailfork_id),
    trailforkUrl: readString(properties.trailforkUrl) ?? readString(trailfork?.url),
    difficulty: readString(trailfork?.difficulty),
    activityType: readString(trailfork?.activityType),
    trailType: readString(trailfork?.trailType),
    usage: readString(trailfork?.usage),
    direction: readString(trailfork?.direction),
    distanceMeters: parseNumeric(trailfork?.distanceMeters),
    altClimbMeters: parseNumeric(trailfork?.altClimbMeters),
    altDescentMeters: parseNumeric(trailfork?.altDescentMeters),
    avgTimeSeconds: parseNumeric(trailfork?.avgTimeSeconds),
    popularityScore: parseNumeric(trailfork?.popularityScore),
    globalRank: parseNumeric(trailfork?.globalRank),
    osmTags,
    sourceFiles: sources ?? {},
    warnings: Array.isArray(properties.warnings)
      ? properties.warnings.filter((entry): entry is string => typeof entry === "string")
      : [],
  };
}

export function analyzeTrailFeature(feature: PlaygroundFeature): PlaygroundTrailStats {
  const properties = feature.properties;
  const trailfork = readTrailforkProperties(properties);
  const computedLength = computePathLengthMeters(feature.geometry.coordinates);
  const elevation = computeElevationStats(feature.geometry.coordinates);
  const vertexCount = parseNumeric(properties.vertexCount) ?? feature.geometry.coordinates.length;

  return {
    featureKey: getFeatureKey(feature),
    name: readString(properties.name) ?? "Unnamed trail",
    slug: readString(properties.slug),
    source: readString(properties.source),
    vertexCount,
    lengthMeters: trailfork.distanceMeters ?? computedLength,
    elevation,
    trailforkId: trailfork.trailforkId,
    trailforkUrl: trailfork.trailforkUrl,
    difficulty: trailfork.difficulty,
    activityType: trailfork.activityType,
    trailType: trailfork.trailType,
    usage: trailfork.usage,
    direction: trailfork.direction,
    distanceMeters: trailfork.distanceMeters,
    altClimbMeters: trailfork.altClimbMeters,
    altDescentMeters: trailfork.altDescentMeters,
    avgTimeSeconds: trailfork.avgTimeSeconds,
    popularityScore: trailfork.popularityScore,
    globalRank: trailfork.globalRank,
    osmTags: trailfork.osmTags,
    sourceFiles: trailfork.sourceFiles,
    warnings: trailfork.warnings,
    properties,
  };
}

export function formatDistance(meters: number | null) {
  if (meters === null) {
    return "—";
  }
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}

export function formatDuration(seconds: number | null) {
  if (seconds === null) {
    return "—";
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours} h ${remainder} min` : `${hours} h`;
}

export function formatElevation(meters: number | null) {
  if (meters === null) {
    return "—";
  }
  return `${Math.round(meters)} m`;
}

function readCoordinateElevation(coordinate: PlaygroundCoordinate): number | null {
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
  coordinates: PlaygroundCoordinate[],
  latitude: number,
  longitude: number,
) {
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

export function buildTrailHoverTooltipContent(
  feature: PlaygroundFeature,
  latitude: number,
  longitude: number,
) {
  const stats = analyzeTrailFeature(feature);
  const elevation = getElevationAtLatLng(feature.geometry.coordinates, latitude, longitude);
  const headerParts = [stats.name];
  if (stats.difficulty) {
    headerParts.push(stats.difficulty);
  }
  if (stats.lengthMeters !== null) {
    headerParts.push(formatDistance(stats.lengthMeters));
  }
  const header = headerParts.join(" · ");
  if (elevation === null) {
    return header;
  }
  return `${header}<br/><span class="playground-trail-tooltip-elevation">${formatElevation(elevation)}</span>`;
}
