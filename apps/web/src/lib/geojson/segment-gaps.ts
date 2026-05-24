import type { GeoSegmentViewModel } from "@/data-access-layer/geo-segments/geo-segments.types";
import { haversineDistanceMeters } from "@/lib/georeference/affine";

export type SegmentGap = {
  segmentGroupId: string;
  afterSegmentIndex: number;
  beforeSegmentIndex: number;
  afterSegmentId: number;
  beforeSegmentId: number;
  gapMeters: number;
  endCoord: [number, number];
  startCoord: [number, number];
};

export type SegmentGroupGapSummary = {
  segmentGroupId: string;
  segmentCount: number;
  gapCount: number;
};

const DEFAULT_SNAP_TOLERANCE_METERS = 15;

function groupSegmentsByTrail(segments: GeoSegmentViewModel[]) {
  const groups = new Map<string, GeoSegmentViewModel[]>();

  for (const segment of segments) {
    const existing = groups.get(segment.segmentGroupId) ?? [];
    existing.push(segment);
    groups.set(segment.segmentGroupId, existing);
  }

  return groups;
}

function sortSegmentsInGroup(segments: GeoSegmentViewModel[]) {
  return [...segments].sort((left, right) => left.segmentIndex - right.segmentIndex);
}

export function findFeatureGaps(
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

  const groups = groupSegmentsByTrail(filteredSegments);
  const gaps: SegmentGap[] = [];
  const groupSummaries: SegmentGroupGapSummary[] = [];

  for (const [segmentGroupId, groupSegments] of groups) {
    const ordered = sortSegmentsInGroup(groupSegments);
    let groupGapCount = 0;

    for (let index = 0; index < ordered.length - 1; index += 1) {
      const current = ordered[index];
      const next = ordered[index + 1];
      const currentEnd = current.geometry.coordinates.at(-1);
      const nextStart = next.geometry.coordinates[0];

      if (!currentEnd || !nextStart) {
        continue;
      }

      const gapMeters = haversineDistanceMeters(
        currentEnd[1],
        currentEnd[0],
        nextStart[1],
        nextStart[0],
      );

      if (gapMeters > snapToleranceMeters) {
        groupGapCount += 1;
        gaps.push({
          segmentGroupId,
          afterSegmentIndex: current.segmentIndex,
          beforeSegmentIndex: next.segmentIndex,
          afterSegmentId: current.id,
          beforeSegmentId: next.id,
          gapMeters,
          endCoord: currentEnd,
          startCoord: nextStart,
        });
      }
    }

    groupSummaries.push({
      segmentGroupId,
      segmentCount: ordered.length,
      gapCount: groupGapCount,
    });
  }

  groupSummaries.sort((left, right) => left.segmentGroupId.localeCompare(right.segmentGroupId));

  return {
    snapToleranceMeters,
    gapCount: gaps.length,
    gaps,
    groups: groupSummaries,
  };
}

export function summarizeSegmentGroups(segments: GeoSegmentViewModel[]) {
  return findFeatureGaps(segments).groups;
}
