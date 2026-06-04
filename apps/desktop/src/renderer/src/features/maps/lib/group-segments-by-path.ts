import type { GeoSegmentRecord } from "@shared/geo-segments.types";
import type { MapPathGroupSummary } from "@renderer/features/maps/types/map-data-explorer.types";

export function groupSegmentsByPath(segments: GeoSegmentRecord[]): MapPathGroupSummary[] {
  const groups = new Map<string, GeoSegmentRecord[]>();

  for (const segment of segments) {
    const existing = groups.get(segment.segmentGroupId) ?? [];
    existing.push(segment);
    groups.set(segment.segmentGroupId, existing);
  }

  return [...groups.entries()]
    .map(([groupId, groupSegments]) => {
      const sorted = [...groupSegments].sort((a, b) => a.segmentIndex - b.segmentIndex);
      const named = sorted.find((segment) => segment.name);
      const pointCount = sorted.reduce(
        (total, segment) => total + segment.geometry.coordinates.length,
        0,
      );

      return {
        groupId,
        name: named?.name ?? null,
        pathKind: sorted[0]?.pathKind ?? "unknown",
        segmentCount: sorted.length,
        pointCount,
        segmentIds: sorted.map((segment) => segment.id),
      };
    })
    .sort((a, b) => a.groupId.localeCompare(b.groupId));
}
