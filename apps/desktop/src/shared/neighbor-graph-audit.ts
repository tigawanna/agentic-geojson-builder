import { haversineDistanceMeters } from "@repo/isomorphic/nearest-line-point";
import { buildMarkerNeighborIndex } from "@shared/marker-neighbor-index";
import {
  analyzeNeighborRouteLegs,
  getUndirectedNeighborIds,
  type AnalyzeNeighborRouteLegsResult,
} from "@shared/neighbor-graph";
import {
  buildNeighborLinkOverlayEdges,
  NEIGHBOR_LINK_LONG_JUMP_METERS,
} from "@shared/neighbor-link-overlay";
import { resolveMapPointLinkRef } from "@shared/map-point-link-ref";
import type { MarkerNeighborRecord } from "@shared/marker-neighbors.types";
import type { MapPointRecord } from "@shared/map-points.types";

export type NeighborGraphAuditNode = {
  pointId: number;
  ref: string;
  degree: number;
  neighborRefs: string[];
  latitude: number;
  longitude: number;
};

export type NeighborGraphAuditEdge = {
  fromPointId: number;
  toPointId: number;
  fromRef: string;
  toRef: string;
  distanceMeters: number;
};

export type NeighborGraphAuditComponent = {
  size: number;
  refs: string[];
};

export type NeighborGraphPathTrace = {
  fromRef: string;
  toRef: string;
  found: boolean;
  pointRefs: string[];
  distanceMeters: number;
  legs: Array<{
    fromRef: string;
    toRef: string;
    found: boolean;
    hopCount: number;
  }>;
};

export type NeighborGraphAuditResult = {
  mapId: number;
  markerCount: number;
  linkedMarkerCount: number;
  edgeCount: number;
  isolated: NeighborGraphAuditNode[];
  deadEnds: NeighborGraphAuditNode[];
  junctions: NeighborGraphAuditNode[];
  longJumps: NeighborGraphAuditEdge[];
  components: NeighborGraphAuditComponent[];
  largestComponentSize: number;
  pathTrace: NeighborGraphPathTrace | null;
};

function normalizeRef(value: string): string {
  return value.trim().toLowerCase();
}

export function findMapPointByRef(mapPoints: MapPointRecord[], ref: string): MapPointRecord | null {
  const target = normalizeRef(ref);
  return mapPoints.find((point) => normalizeRef(resolveMapPointLinkRef(point)) === target) ?? null;
}

function buildAuditNode(
  point: MapPointRecord,
  neighbors: MarkerNeighborRecord[],
  pointsById: Map<number, MapPointRecord>,
): NeighborGraphAuditNode {
  const neighborIds = getUndirectedNeighborIds(neighbors, point.id);
  return {
    pointId: point.id,
    ref: resolveMapPointLinkRef(point),
    degree: neighborIds.length,
    neighborRefs: neighborIds
      .map((neighborId) => pointsById.get(neighborId))
      .filter((entry): entry is MapPointRecord => entry !== undefined)
      .map((entry) => resolveMapPointLinkRef(entry)),
    latitude: point.latitude,
    longitude: point.longitude,
  };
}

function buildConnectedComponents(
  mapPoints: MapPointRecord[],
  neighbors: MarkerNeighborRecord[],
  pointsById: Map<number, MapPointRecord>,
): NeighborGraphAuditComponent[] {
  const index = buildMarkerNeighborIndex(neighbors);
  const visited = new Set<number>();
  const components: NeighborGraphAuditComponent[] = [];

  for (const point of mapPoints) {
    if (visited.has(point.id)) {
      continue;
    }

    const queue = [point.id];
    const componentIds: number[] = [];
    visited.add(point.id);

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) {
        continue;
      }
      componentIds.push(current);
      const neighborIds = new Set<number>([
        ...(index.outgoing.get(current) ?? []),
        ...(index.incoming.get(current) ?? []),
      ]);
      for (const neighborId of neighborIds) {
        if (visited.has(neighborId)) {
          continue;
        }
        visited.add(neighborId);
        queue.push(neighborId);
      }
    }

    components.push({
      size: componentIds.length,
      refs: componentIds
        .map((pointId) => pointsById.get(pointId))
        .filter((entry): entry is MapPointRecord => entry !== undefined)
        .map((entry) => resolveMapPointLinkRef(entry))
        .sort((left, right) => left.localeCompare(right, undefined, { numeric: true })),
    });
  }

  return components.sort((left, right) => right.size - left.size);
}

function buildPathTrace(input: {
  mapPoints: MapPointRecord[];
  neighbors: MarkerNeighborRecord[];
  fromRef: string;
  toRef: string;
}): NeighborGraphPathTrace | null {
  const fromPoint = findMapPointByRef(input.mapPoints, input.fromRef);
  const toPoint = findMapPointByRef(input.mapPoints, input.toRef);
  if (!fromPoint || !toPoint) {
    return null;
  }

  const analysis: AnalyzeNeighborRouteLegsResult = analyzeNeighborRouteLegs({
    mapPoints: input.mapPoints,
    neighbors: input.neighbors,
    fromPointId: fromPoint.id,
    toPointId: toPoint.id,
  });
  const pointsById = new Map(input.mapPoints.map((point) => [point.id, point]));

  return {
    fromRef: resolveMapPointLinkRef(fromPoint),
    toRef: resolveMapPointLinkRef(toPoint),
    found: analysis.merged.found,
    pointRefs: analysis.merged.pointIds
      .map((pointId) => pointsById.get(pointId))
      .filter((entry): entry is MapPointRecord => entry !== undefined)
      .map((entry) => resolveMapPointLinkRef(entry)),
    distanceMeters: analysis.merged.totalDistanceMeters,
    legs: analysis.legs.map((leg) => {
      const fromPoint = pointsById.get(leg.fromPointId);
      const toPoint = pointsById.get(leg.toPointId);
      return {
        fromRef: fromPoint ? resolveMapPointLinkRef(fromPoint) : String(leg.fromPointId),
        toRef: toPoint ? resolveMapPointLinkRef(toPoint) : String(leg.toPointId),
        found: leg.found,
        hopCount: Math.max(0, leg.pointIds.length - 1),
      };
    }),
  };
}

export function auditNeighborGraph(input: {
  mapId: number;
  mapPoints: MapPointRecord[];
  neighbors: MarkerNeighborRecord[];
  longJumpThresholdMeters?: number;
  fromRef?: string;
  toRef?: string;
}): NeighborGraphAuditResult {
  const pointsById = new Map(input.mapPoints.map((point) => [point.id, point]));
  const linkedMarkerIds = new Set<number>();
  for (const neighbor of input.neighbors) {
    linkedMarkerIds.add(neighbor.fromMarkerId);
    linkedMarkerIds.add(neighbor.toMarkerId);
  }

  const nodes = input.mapPoints.map((point) => buildAuditNode(point, input.neighbors, pointsById));
  const isolated = nodes.filter((node) => node.degree === 0);
  const deadEnds = nodes.filter((node) => node.degree === 1);
  const junctions = nodes.filter((node) => node.degree >= 3);

  const longJumpThresholdMeters = input.longJumpThresholdMeters ?? NEIGHBOR_LINK_LONG_JUMP_METERS;
  const longJumps = buildNeighborLinkOverlayEdges({
    mapPoints: input.mapPoints,
    neighbors: input.neighbors,
    resolveRef: resolveMapPointLinkRef,
    longJumpThresholdMeters,
  })
    .filter((edge) => edge.isLongJump)
    .map((edge) => ({
      fromPointId: edge.fromMarkerId,
      toPointId: edge.toMarkerId,
      fromRef: edge.fromRef,
      toRef: edge.toRef,
      distanceMeters: edge.distanceMeters,
    }))
    .sort((left, right) => right.distanceMeters - left.distanceMeters);

  const components = buildConnectedComponents(input.mapPoints, input.neighbors, pointsById);
  const pathTrace =
    input.fromRef && input.toRef
      ? buildPathTrace({
          mapPoints: input.mapPoints,
          neighbors: input.neighbors,
          fromRef: input.fromRef,
          toRef: input.toRef,
        })
      : null;

  return {
    mapId: input.mapId,
    markerCount: input.mapPoints.length,
    linkedMarkerCount: linkedMarkerIds.size,
    edgeCount: input.neighbors.length,
    isolated: isolated.sort((left, right) =>
      left.ref.localeCompare(right.ref, undefined, { numeric: true }),
    ),
    deadEnds: deadEnds.sort((left, right) =>
      left.ref.localeCompare(right.ref, undefined, { numeric: true }),
    ),
    junctions: junctions.sort((left, right) =>
      left.ref.localeCompare(right.ref, undefined, { numeric: true }),
    ),
    longJumps,
    components,
    largestComponentSize: components[0]?.size ?? 0,
    pathTrace,
  };
}

export function formatNeighborGraphAuditReport(result: NeighborGraphAuditResult): string {
  const lines: string[] = [
    `Neighbor graph audit — map ${result.mapId}`,
    `Markers: ${result.markerCount} · linked: ${result.linkedMarkerCount} · edges: ${result.edgeCount}`,
    `Components: ${result.components.length} · largest: ${result.largestComponentSize}`,
  ];

  if (result.isolated.length > 0) {
    lines.push("", `Isolated (0 neighbors) — ${result.isolated.length}:`);
    for (const node of result.isolated) {
      lines.push(`  · ${node.ref}`);
    }
  }

  if (result.longJumps.length > 0) {
    lines.push(
      "",
      `Long jumps (>${NEIGHBOR_LINK_LONG_JUMP_METERS} m) — ${result.longJumps.length}:`,
    );
    for (const edge of result.longJumps) {
      lines.push(`  · ${edge.fromRef} → ${edge.toRef} · ${Math.round(edge.distanceMeters)} m`);
    }
  }

  if (result.components.length > 1) {
    lines.push("", "Disconnected components:");
    for (const [index, component] of result.components.entries()) {
      const preview = component.refs.slice(0, 8).join(", ");
      const suffix = component.refs.length > 8 ? ` … +${component.refs.length - 8} more` : "";
      lines.push(`  ${index + 1}. size ${component.size}: ${preview}${suffix}`);
    }
  }

  if (result.deadEnds.length > 0) {
    lines.push("", `Dead ends (degree 1) — ${result.deadEnds.length}:`);
    const preview = result.deadEnds
      .slice(0, 20)
      .map((node) => `${node.ref} → ${node.neighborRefs[0] ?? "?"}`);
    lines.push(`  · ${preview.join(" · ")}`);
    if (result.deadEnds.length > 20) {
      lines.push(`  … +${result.deadEnds.length - 20} more`);
    }
  }

  if (result.pathTrace) {
    lines.push("", `Path ${result.pathTrace.fromRef} → ${result.pathTrace.toRef}:`);
    if (!result.pathTrace.found) {
      for (const leg of result.pathTrace.legs) {
        if (!leg.found) {
          lines.push(`  ✗ broken leg ${leg.fromRef} → ${leg.toRef}`);
        }
      }
    } else {
      lines.push(
        `  ✓ ${result.pathTrace.pointRefs.join(" → ")} · ~${Math.round(result.pathTrace.distanceMeters)} m`,
      );
    }
  }

  return lines.join("\n");
}

export function neighborEdgeDistanceMeters(
  fromPoint: MapPointRecord,
  toPoint: MapPointRecord,
): number {
  return haversineDistanceMeters(
    fromPoint.latitude,
    fromPoint.longitude,
    toPoint.latitude,
    toPoint.longitude,
  );
}
