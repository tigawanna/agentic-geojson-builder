import type { MapPointNodeRole } from "@shared/map-points.types.js";
import type { StoredLineStringGeometry } from "@shared/geo-segments.types.js";
import {
  pathLengthMeters,
  projectPointFractionOnLine,
  sliceLineBetweenFractions,
} from "@main/lib/geojson/line-fraction.js";

export type SegmentationMarker = {
  ref: string;
  longitude: number;
  latitude: number;
  nodeRole: MapPointNodeRole | null;
  category: string;
};

export type ProposedSegmentEdge = {
  fromRef: string;
  toRef: string;
  startFraction: number;
  endFraction: number;
  geometry: StoredLineStringGeometry;
  lengthM: number;
};

export type SegmentationSkippedMarker = {
  ref: string;
  reason: string;
};

const DEFAULT_MAX_PROJECTION_DISTANCE_METERS = 40;

function isRoutingNode(marker: SegmentationMarker): boolean {
  if (marker.nodeRole === "junction" || marker.nodeRole === "endpoint") {
    return true;
  }
  return marker.category === "junction" || marker.category === "gate";
}

export function buildSegmentProposalsFromPath(
  pathCoordinates: [number, number][],
  markers: SegmentationMarker[],
  options?: { maxProjectionDistanceMeters?: number },
): { proposed: ProposedSegmentEdge[]; skipped: SegmentationSkippedMarker[] } {
  const maxDistance =
    options?.maxProjectionDistanceMeters ?? DEFAULT_MAX_PROJECTION_DISTANCE_METERS;
  const skipped: SegmentationSkippedMarker[] = [];

  if (pathCoordinates.length < 2) {
    return { proposed: [], skipped };
  }

  const projected: Array<{ ref: string; fraction: number }> = [];

  for (const marker of markers) {
    if (!marker.ref) {
      continue;
    }

    if (!isRoutingNode(marker)) {
      skipped.push({ ref: marker.ref, reason: "not a routing node" });
      continue;
    }

    const projection = projectPointFractionOnLine(
      marker.longitude,
      marker.latitude,
      pathCoordinates,
    );

    if (!projection) {
      skipped.push({ ref: marker.ref, reason: "could not project onto path" });
      continue;
    }

    if (projection.distanceMeters > maxDistance) {
      skipped.push({
        ref: marker.ref,
        reason: `too far from path (${Math.round(projection.distanceMeters)}m)`,
      });
      continue;
    }

    projected.push({ ref: marker.ref, fraction: projection.fraction });
  }

  projected.sort((left, right) => left.fraction - right.fraction);

  const deduped: Array<{ ref: string; fraction: number }> = [];
  for (const item of projected) {
    const last = deduped.at(-1);
    if (last && Math.abs(last.fraction - item.fraction) < 1e-6) {
      continue;
    }
    deduped.push(item);
  }

  const proposed: ProposedSegmentEdge[] = [];

  for (let index = 0; index < deduped.length - 1; index += 1) {
    const from = deduped[index];
    const to = deduped[index + 1];
    if (!from || !to) {
      continue;
    }

    if (from.ref === to.ref) {
      continue;
    }

    const startFraction = from.fraction;
    const endFraction = to.fraction;
    if (Math.abs(endFraction - startFraction) < 1e-8) {
      continue;
    }

    const coordinates = sliceLineBetweenFractions(pathCoordinates, startFraction, endFraction);
    if (coordinates.length < 2) {
      continue;
    }

    proposed.push({
      fromRef: from.ref,
      toRef: to.ref,
      startFraction,
      endFraction,
      geometry: { type: "LineString", coordinates },
      lengthM: pathLengthMeters(coordinates),
    });
  }

  return { proposed, skipped };
}
