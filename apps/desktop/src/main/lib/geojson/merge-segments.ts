import type { GeoSegmentRecord } from "@shared/geo-segments.types.js";
import type { StoredLineStringGeometry } from "@shared/geo-segments.types.js";
import { haversineDistanceMeters } from "@main/lib/georeference/affine.js";

export type MergedSegmentGroup = {
  segmentGroupId: string;
  name: string | null;
  pathKind: GeoSegmentRecord["pathKind"];
  status: GeoSegmentRecord["status"];
  sourceSegmentIds: number[];
  vertexCount: number;
  geometry: StoredLineStringGeometry;
};

const DEFAULT_SNAP_TOLERANCE_METERS = 15;

function sortSegmentsInGroup(segments: GeoSegmentRecord[]) {
  return [...segments].sort((left, right) => left.segmentIndex - right.segmentIndex);
}

function coordinatesEqual(
  left: [number, number],
  right: [number, number],
  snapToleranceMeters: number,
) {
  return haversineDistanceMeters(left[1], left[0], right[1], right[0]) <= snapToleranceMeters;
}

function mergeSegmentGroup(
  segments: GeoSegmentRecord[],
  snapToleranceMeters: number,
): MergedSegmentGroup | null {
  if (segments.length === 0) {
    return null;
  }

  const ordered = sortSegmentsInGroup(segments);
  const first = ordered[0];
  if (!first) {
    return null;
  }

  const coordinates: [number, number][] = [...first.geometry.coordinates];

  for (let index = 1; index < ordered.length; index += 1) {
    const nextSegment = ordered[index];
    if (!nextSegment) {
      continue;
    }

    const nextCoordinates = nextSegment.geometry.coordinates;
    const nextStart = nextCoordinates[0];
    if (!nextStart) {
      continue;
    }

    const lastCoordinate = coordinates.at(-1) ?? nextStart;
    const appendFrom = coordinatesEqual(lastCoordinate, nextStart, snapToleranceMeters) ? 1 : 0;

    coordinates.push(...nextCoordinates.slice(appendFrom));
  }

  if (coordinates.length < 2) {
    return null;
  }

  const primary = first;
  const status = ordered.every((segment) => segment.status === "accepted")
    ? "accepted"
    : ordered.some((segment) => segment.status === "rejected")
      ? "rejected"
      : ordered.every((segment) => segment.status === "draft")
        ? "draft"
        : "needs-review";

  return {
    segmentGroupId: primary.segmentGroupId,
    name: ordered.find((segment) => segment.name)?.name ?? primary.name,
    pathKind: primary.pathKind,
    status,
    sourceSegmentIds: ordered.map((segment) => segment.id),
    vertexCount: coordinates.length,
    geometry: {
      type: "LineString",
      coordinates,
    },
  };
}

export function mergeFeatureSegmentGroups(
  segments: GeoSegmentRecord[],
  options?: {
    segmentGroupId?: string;
    snapToleranceMeters?: number;
  },
) {
  const snapToleranceMeters = options?.snapToleranceMeters ?? DEFAULT_SNAP_TOLERANCE_METERS;
  const filteredSegments =
    options?.segmentGroupId === undefined
      ? segments
      : segments.filter((segment) => segment.segmentGroupId === options.segmentGroupId);

  const groups = new Map<string, GeoSegmentRecord[]>();
  for (const segment of filteredSegments) {
    const existing = groups.get(segment.segmentGroupId) ?? [];
    existing.push(segment);
    groups.set(segment.segmentGroupId, existing);
  }

  const merged = [...groups.entries()]
    .sort(([leftGroupId], [rightGroupId]) => leftGroupId.localeCompare(rightGroupId))
    .map(([, groupSegments]) => mergeSegmentGroup(groupSegments, snapToleranceMeters))
    .filter((group): group is MergedSegmentGroup => group !== null);

  return {
    snapToleranceMeters,
    mergedCount: merged.length,
    merged,
  };
}
