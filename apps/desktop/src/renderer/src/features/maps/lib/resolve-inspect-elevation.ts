import { getElevationAtLatLng } from "@repo/isomorphic/elevation-at-point";
import {
  findNearestPointOnGuides,
  haversineDistanceMeters,
  type LineGuide,
} from "@repo/isomorphic/nearest-line-point";
import type { MapboxGeoJSONFeature } from "mapbox-gl";
import { partitionMapboxFeatures } from "@renderer/features/maps/lib/mapbox-feature-utils";
import type { ReferenceInspectHover } from "@renderer/features/maps/lib/reference-inspect-tooltip";

const ELEVATION_PROPERTY_KEYS = [
  "ele",
  "elevation",
  "elevation_m",
  "alt",
  "altitude",
  "height",
  "z",
] as const;

const MAX_NEARBY_POINT_DISTANCE_METERS = 100;

export type InspectElevationSource =
  | "reference_trail"
  | "trail_geometry"
  | "control_point"
  | "map_point"
  | "mapbox_feature"
  | "terrain";

export type ResolvedInspectElevation = {
  elevationMeters: number;
  source: InspectElevationSource;
  distanceMeters: number;
};

type NearbyElevationPoint = {
  latitude: number;
  longitude: number;
  elevationMeters: number;
};

type ResolveInspectElevationInput = {
  latitude: number;
  longitude: number;
  referenceHover?: ReferenceInspectHover | null;
  trailGuides?: LineGuide[];
  terrainElevationMeters?: number | null;
  controlPoints?: NearbyElevationPoint[];
  mapPoints?: NearbyElevationPoint[];
  features?: MapboxGeoJSONFeature[];
  maxNearbyPointDistanceMeters?: number;
};

type ElevationCandidate = ResolvedInspectElevation;

function parseElevationFromProperties(
  properties: Record<string, unknown> | null | undefined,
): number | null {
  if (!properties) {
    return null;
  }
  for (const key of ELEVATION_PROPERTY_KEYS) {
    const value = properties[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function pushNearbyPoints(
  candidates: ElevationCandidate[],
  points: NearbyElevationPoint[] | undefined,
  latitude: number,
  longitude: number,
  source: Extract<InspectElevationSource, "control_point" | "map_point">,
  maxDistanceMeters: number,
) {
  for (const point of points ?? []) {
    if (!Number.isFinite(point.elevationMeters)) {
      continue;
    }
    const distanceMeters = haversineDistanceMeters(
      latitude,
      longitude,
      point.latitude,
      point.longitude,
    );
    if (distanceMeters > maxDistanceMeters) {
      continue;
    }
    candidates.push({
      elevationMeters: point.elevationMeters,
      distanceMeters,
      source,
    });
  }
}

function compareCandidates(a: ElevationCandidate, b: ElevationCandidate): number {
  const distanceDelta = a.distanceMeters - b.distanceMeters;
  if (distanceDelta !== 0) {
    return distanceDelta;
  }
  const priority: Record<InspectElevationSource, number> = {
    reference_trail: 0,
    trail_geometry: 1,
    control_point: 2,
    map_point: 3,
    mapbox_feature: 4,
    terrain: 5,
  };
  return priority[a.source] - priority[b.source];
}

export function resolveInspectElevation(
  input: ResolveInspectElevationInput,
): ResolvedInspectElevation | null {
  const candidates: ElevationCandidate[] = [];
  const maxNearbyDistanceMeters =
    input.maxNearbyPointDistanceMeters ?? MAX_NEARBY_POINT_DISTANCE_METERS;

  if (input.referenceHover) {
    const { nearest } = input.referenceHover;
    const trailElevationMeters = getElevationAtLatLng(
      nearest.coordinates,
      nearest.latitude,
      nearest.longitude,
    );
    if (trailElevationMeters !== null) {
      candidates.push({
        elevationMeters: trailElevationMeters,
        distanceMeters: nearest.distanceMeters,
        source: "reference_trail",
      });
    }
  }

  if (input.trailGuides && input.trailGuides.length > 0) {
    const nearest = findNearestPointOnGuides(input.latitude, input.longitude, input.trailGuides);
    if (nearest && nearest.distanceMeters <= maxNearbyDistanceMeters) {
      const trailElevationMeters = getElevationAtLatLng(
        nearest.coordinates,
        nearest.latitude,
        nearest.longitude,
      );
      if (trailElevationMeters !== null) {
        candidates.push({
          elevationMeters: trailElevationMeters,
          distanceMeters: nearest.distanceMeters,
          source: "trail_geometry",
        });
      }
    }
  }

  pushNearbyPoints(
    candidates,
    input.controlPoints,
    input.latitude,
    input.longitude,
    "control_point",
    maxNearbyDistanceMeters,
  );
  pushNearbyPoints(
    candidates,
    input.mapPoints,
    input.latitude,
    input.longitude,
    "map_point",
    maxNearbyDistanceMeters,
  );
  const { basemap } = partitionMapboxFeatures(input.features ?? []);
  for (const feature of basemap) {
    const elevationMeters = parseElevationFromProperties(
      feature.properties as Record<string, unknown> | undefined,
    );
    if (elevationMeters !== null) {
      candidates.push({
        elevationMeters,
        distanceMeters: 0,
        source: "mapbox_feature",
      });
    }
  }

  if (candidates.length > 0) {
    candidates.sort(compareCandidates);
    return candidates[0] ?? null;
  }

  if (
    input.terrainElevationMeters !== null &&
    input.terrainElevationMeters !== undefined &&
    Number.isFinite(input.terrainElevationMeters)
  ) {
    return {
      elevationMeters: input.terrainElevationMeters,
      distanceMeters: 0,
      source: "terrain",
    };
  }

  return null;
}

export function resolveInspectElevationMeters(input: ResolveInspectElevationInput): number | null {
  return resolveInspectElevation(input)?.elevationMeters ?? null;
}

export function toNearbyElevationPointsFromControlPoints(
  controlPoints: Array<{ latitude: number; longitude: number; altitudeM: number | null }>,
): NearbyElevationPoint[] {
  const points: NearbyElevationPoint[] = [];
  for (const point of controlPoints) {
    if (point.altitudeM === null || !Number.isFinite(point.altitudeM)) {
      continue;
    }
    points.push({
      latitude: point.latitude,
      longitude: point.longitude,
      elevationMeters: point.altitudeM,
    });
  }
  return points;
}

export function toNearbyElevationPointsFromMapPoints(
  mapPoints: Array<{ latitude: number; longitude: number; elevation: number | null }>,
): NearbyElevationPoint[] {
  const points: NearbyElevationPoint[] = [];
  for (const point of mapPoints) {
    if (point.elevation === null || !Number.isFinite(point.elevation)) {
      continue;
    }
    points.push({
      latitude: point.latitude,
      longitude: point.longitude,
      elevationMeters: point.elevation,
    });
  }
  return points;
}
