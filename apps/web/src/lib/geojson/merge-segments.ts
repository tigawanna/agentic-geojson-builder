import type { GeoSegmentViewModel } from "@/data-access-layer/geo-segments/geo-segments.types";
import type { StoredLineStringGeometry } from "@/lib/drizzle/schema/maps/geo-segment.schema";
import { haversineDistanceMeters } from "@/lib/georeference/affine";

export type MergedSegmentGroup = {
  segmentGroupId: string;
  name: string | null;
  pathKind: GeoSegmentViewModel["pathKind"];
  status: GeoSegmentViewModel["status"];
  sourceSegmentIds: number[];
  vertexCount: number;
  geometry: StoredLineStringGeometry;
};

const DEFAULT_SNAP_TOLERANCE_METERS = 15;

function sortSegmentsInGroup(segments: GeoSegmentViewModel[]) {
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
  segments: GeoSegmentViewModel[],
  snapToleranceMeters: number,
): MergedSegmentGroup | null {
  if (segments.length === 0) {
    return null;
  }

  const ordered = sortSegmentsInGroup(segments);
  const coordinates: [number, number][] = [...ordered[0].geometry.coordinates];

  for (let index = 1; index < ordered.length; index += 1) {
    const nextCoordinates = ordered[index].geometry.coordinates;
    const appendFrom = coordinatesEqual(
      coordinates.at(-1) ?? nextCoordinates[0],
      nextCoordinates[0],
      snapToleranceMeters,
    )
      ? 1
      : 0;

    coordinates.push(...nextCoordinates.slice(appendFrom));
  }

  if (coordinates.length < 2) {
    return null;
  }

  const primary = ordered[0];
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
  segments: GeoSegmentViewModel[],
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

  const groups = new Map<string, GeoSegmentViewModel[]>();
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
