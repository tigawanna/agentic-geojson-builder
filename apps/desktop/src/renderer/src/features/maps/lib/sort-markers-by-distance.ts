import { resolveMapPointLinkRef } from "@shared/map-point-link-ref";
import type { MapPointRecord } from "@shared/map-points.types";
import { haversineDistanceMeters } from "@repo/isomorphic/nearest-line-point";

export function sortMapPointsByDistanceFrom(
  mapPoints: MapPointRecord[],
  anchor: MapPointRecord,
  excludeIds: Set<number> = new Set(),
): Array<{ point: MapPointRecord; distanceMeters: number }> {
  return mapPoints
    .filter((point) => !excludeIds.has(point.id))
    .map((point) => ({
      point,
      distanceMeters: haversineDistanceMeters(
        anchor.latitude,
        anchor.longitude,
        point.latitude,
        point.longitude,
      ),
    }))
    .sort((left, right) => {
      const distanceDelta = left.distanceMeters - right.distanceMeters;
      if (distanceDelta !== 0) {
        return distanceDelta;
      }
      return resolveMapPointLinkRef(left.point).localeCompare(resolveMapPointLinkRef(right.point));
    });
}
