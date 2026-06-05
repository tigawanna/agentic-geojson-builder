import type { GeoSegmentRecord } from "@shared/geo-segments.types";

export function combinePathCoordinates(
  segments: GeoSegmentRecord[],
  pathSlug: string,
): [number, number][] {
  const ordered = segments
    .filter((segment) => segment.segmentGroupId === pathSlug)
    .sort((left, right) => left.segmentIndex - right.segmentIndex);
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
