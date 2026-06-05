import { sortMapPointsByChainHead } from "@renderer/features/maps/lib/suggest-link-chain-markers";
import { buildMarkerNeighborIndex } from "@shared/marker-neighbor-index";
import { resolveMapPointLinkRef } from "@shared/map-point-link-ref";
import type { MapLinkRecord } from "@shared/map-links.types";
import type { MarkerNeighborRecord } from "@shared/marker-neighbors.types";
import type { MapPointRecord } from "@shared/map-points.types";
import { haversineDistanceMeters } from "@repo/isomorphic/nearest-line-point";

export type ComposerMarkerRow = {
  pointId: number;
  linkRef: string;
  ref: string | null;
  name: string | null;
  chainIndex: number | null;
  neighborLabels: string[];
  savedSegmentLabels: string[];
  distanceFromHeadMeters: number | null;
};

export function listComposerMarkers(input: {
  mapPoints: MapPointRecord[];
  chainPointIds: number[];
  mapLinks: MapLinkRecord[];
  markerNeighbors?: MarkerNeighborRecord[];
}): ComposerMarkerRow[] {
  const chainIndexById = new Map(input.chainPointIds.map((pointId, index) => [pointId, index + 1]));

  const linksByRef = new Map<string, string[]>();
  for (const link of input.mapLinks) {
    for (const ref of [link.fromRef, link.toRef]) {
      const list = linksByRef.get(ref) ?? [];
      list.push(`${link.fromRef}→${link.toRef}`);
      linksByRef.set(ref, list);
    }
  }

  const headPointId = input.chainPointIds.at(-1) ?? null;
  const headPoint =
    headPointId !== null ? input.mapPoints.find((point) => point.id === headPointId) : null;

  const neighborIndex = buildMarkerNeighborIndex(input.markerNeighbors ?? []);
  const pointsById = new Map(input.mapPoints.map((point) => [point.id, point]));

  return sortMapPointsByChainHead({
    mapPoints: input.mapPoints,
    chainPointIds: input.chainPointIds,
  }).map((point) => {
    const linkRef = resolveMapPointLinkRef(point);
    const outgoing = neighborIndex.outgoing.get(point.id);
    const neighborLabels: string[] = [];
    if (outgoing) {
      for (const toMarkerId of outgoing) {
        const target = pointsById.get(toMarkerId);
        if (target) {
          neighborLabels.push(resolveMapPointLinkRef(target));
        }
      }
    }

    return {
      pointId: point.id,
      linkRef,
      ref: point.ref?.trim() || null,
      name: point.name?.trim() || null,
      chainIndex: chainIndexById.get(point.id) ?? null,
      neighborLabels,
      savedSegmentLabels: [...new Set(linksByRef.get(linkRef) ?? [])],
      distanceFromHeadMeters: headPoint
        ? haversineDistanceMeters(
            headPoint.latitude,
            headPoint.longitude,
            point.latitude,
            point.longitude,
          )
        : null,
    };
  });
}
