import { resolveMapPointLinkRef } from "@shared/map-point-link-ref";
import { buildMarkerNeighborIndex } from "@shared/marker-neighbor-index";
import type { MarkerNeighborRecord } from "@shared/marker-neighbors.types";
import type { MapPointRecord } from "@shared/map-points.types";
import { haversineDistanceMeters } from "@repo/isomorphic/nearest-line-point";

export type LinkChainSuggestionReason = "hint" | "points-here" | "nearby";

export type LinkChainMarkerSuggestion = {
  pointId: number;
  ref: string;
  distanceMeters: number;
  reason: LinkChainSuggestionReason;
  hintLabel: string | null;
};

const DEFAULT_SUGGESTION_LIMIT = 8;
const MIN_NEARBY_RADIUS_METERS = 60;
const MAX_NEARBY_RADIUS_METERS = 350;

function distanceBetweenPoints(left: MapPointRecord, right: MapPointRecord): number {
  return haversineDistanceMeters(left.latitude, left.longitude, right.latitude, right.longitude);
}

export function suggestLinkChainMarkers(input: {
  mapPoints: MapPointRecord[];
  chainPointIds: number[];
  markerNeighbors?: MarkerNeighborRecord[];
  limit?: number;
}): LinkChainMarkerSuggestion[] {
  const chainSet = new Set(input.chainPointIds);
  const headPointId = input.chainPointIds.at(-1) ?? null;
  const headPoint =
    headPointId !== null ? input.mapPoints.find((point) => point.id === headPointId) : null;

  const limit = input.limit ?? DEFAULT_SUGGESTION_LIMIT;
  const neighborIndex = buildMarkerNeighborIndex(input.markerNeighbors ?? []);
  const picked = new Map<number, LinkChainMarkerSuggestion>();

  function addSuggestion(
    point: MapPointRecord,
    reason: LinkChainSuggestionReason,
    hintLabel: string | null,
  ) {
    if (chainSet.has(point.id) || picked.has(point.id)) {
      return;
    }
    picked.set(point.id, {
      pointId: point.id,
      ref: resolveMapPointLinkRef(point),
      distanceMeters: headPoint ? distanceBetweenPoints(headPoint, point) : 0,
      reason,
      hintLabel,
    });
  }

  if (headPoint) {
    const outgoing = neighborIndex.outgoing.get(headPoint.id);
    if (outgoing) {
      for (const toMarkerId of outgoing) {
        const hinted = input.mapPoints.find((point) => point.id === toMarkerId);
        if (hinted) {
          addSuggestion(hinted, "hint", "neighbor");
        }
      }
    }

    const incoming = neighborIndex.incoming.get(headPoint.id);
    if (incoming) {
      for (const fromMarkerId of incoming) {
        const linked = input.mapPoints.find((point) => point.id === fromMarkerId);
        if (linked) {
          addSuggestion(linked, "points-here", "linked");
        }
      }
    }

    const nearbyCandidates = input.mapPoints
      .filter((point) => !chainSet.has(point.id) && !picked.has(point.id))
      .map((point) => ({
        point,
        distanceMeters: distanceBetweenPoints(headPoint, point),
      }))
      .sort((left, right) => left.distanceMeters - right.distanceMeters);

    const nearestDistance = nearbyCandidates[0]?.distanceMeters ?? MIN_NEARBY_RADIUS_METERS;
    const nearbyRadius = Math.min(
      MAX_NEARBY_RADIUS_METERS,
      Math.max(MIN_NEARBY_RADIUS_METERS, nearestDistance * 2.5),
    );

    for (const candidate of nearbyCandidates) {
      if (candidate.distanceMeters > nearbyRadius) {
        break;
      }
      addSuggestion(candidate.point, "nearby", null);
      if (picked.size >= limit) {
        break;
      }
    }
  } else {
    for (const point of input.mapPoints) {
      if (chainSet.has(point.id)) {
        continue;
      }
      addSuggestion(point, "nearby", null);
      if (picked.size >= limit) {
        break;
      }
    }
  }

  const reasonOrder: Record<LinkChainSuggestionReason, number> = {
    hint: 0,
    "points-here": 1,
    nearby: 2,
  };

  return [...picked.values()]
    .sort((left, right) => {
      const reasonDelta = reasonOrder[left.reason] - reasonOrder[right.reason];
      if (reasonDelta !== 0) {
        return reasonDelta;
      }
      return left.distanceMeters - right.distanceMeters;
    })
    .slice(0, limit);
}

export function sortMapPointsByChainHead(input: {
  mapPoints: MapPointRecord[];
  chainPointIds: number[];
}): MapPointRecord[] {
  const headPointId = input.chainPointIds.at(-1) ?? null;
  const headPoint =
    headPointId !== null ? input.mapPoints.find((point) => point.id === headPointId) : null;

  if (!headPoint) {
    return [...input.mapPoints].sort((left, right) =>
      resolveMapPointLinkRef(left).localeCompare(resolveMapPointLinkRef(right)),
    );
  }

  return [...input.mapPoints].sort((left, right) => {
    const leftDistance = distanceBetweenPoints(headPoint, left);
    const rightDistance = distanceBetweenPoints(headPoint, right);
    return leftDistance - rightDistance;
  });
}
