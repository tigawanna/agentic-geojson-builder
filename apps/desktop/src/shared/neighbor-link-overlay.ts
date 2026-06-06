import { haversineDistanceMeters } from "@repo/isomorphic/nearest-line-point";
import type { MarkerNeighborRecord } from "@shared/marker-neighbors.types";
import type { MapPointRecord } from "@shared/map-points.types";

export const NEIGHBOR_LINK_LONG_JUMP_METERS = 150;

export type NeighborLinkOverlayEdge = {
  fromMarkerId: number;
  toMarkerId: number;
  fromRef: string;
  toRef: string;
  coordinates: [number, number][];
  distanceMeters: number;
  isLongJump: boolean;
  arrowBearing: number;
  arrowCoordinate: [number, number];
};

function undirectedEdgeKey(fromMarkerId: number, toMarkerId: number): string {
  return fromMarkerId < toMarkerId
    ? `${fromMarkerId}-${toMarkerId}`
    : `${toMarkerId}-${fromMarkerId}`;
}

function bearingDegrees(from: [number, number], to: [number, number]): number {
  const lat1 = (from[1] * Math.PI) / 180;
  const lat2 = (to[1] * Math.PI) / 180;
  const deltaLng = ((to[0] - from[0]) * Math.PI) / 180;
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function interpolateCoordinate(
  from: [number, number],
  to: [number, number],
  ratio: number,
): [number, number] {
  return [from[0] + (to[0] - from[0]) * ratio, from[1] + (to[1] - from[1]) * ratio];
}

export function buildNeighborLinkOverlayEdges(input: {
  mapPoints: MapPointRecord[];
  neighbors: MarkerNeighborRecord[];
  resolveRef: (point: MapPointRecord) => string;
  longJumpThresholdMeters?: number;
}): NeighborLinkOverlayEdge[] {
  const longJumpThresholdMeters = input.longJumpThresholdMeters ?? NEIGHBOR_LINK_LONG_JUMP_METERS;
  const pointsById = new Map(input.mapPoints.map((point) => [point.id, point]));
  const seen = new Set<string>();
  const edges: NeighborLinkOverlayEdge[] = [];

  for (const neighbor of input.neighbors) {
    const key = undirectedEdgeKey(neighbor.fromMarkerId, neighbor.toMarkerId);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    const fromPoint = pointsById.get(neighbor.fromMarkerId);
    const toPoint = pointsById.get(neighbor.toMarkerId);
    if (!fromPoint || !toPoint) {
      continue;
    }

    const fromCoordinate: [number, number] = [fromPoint.longitude, fromPoint.latitude];
    const toCoordinate: [number, number] = [toPoint.longitude, toPoint.latitude];
    const distanceMeters = haversineDistanceMeters(
      fromPoint.latitude,
      fromPoint.longitude,
      toPoint.latitude,
      toPoint.longitude,
    );

    edges.push({
      fromMarkerId: neighbor.fromMarkerId,
      toMarkerId: neighbor.toMarkerId,
      fromRef: input.resolveRef(fromPoint),
      toRef: input.resolveRef(toPoint),
      coordinates: [fromCoordinate, toCoordinate],
      distanceMeters,
      isLongJump: distanceMeters > longJumpThresholdMeters,
      arrowBearing: bearingDegrees(fromCoordinate, toCoordinate),
      arrowCoordinate: interpolateCoordinate(fromCoordinate, toCoordinate, 0.72),
    });
  }

  return edges;
}

export function neighborLinkOverlayColor(isLongJump: boolean): string {
  return isLongJump ? "#f97316" : "#6366f1";
}
