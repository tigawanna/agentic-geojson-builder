import type { ExportGeoJsonResult, GeoSegmentRecord } from "@shared/geo-segments.types.js";
import {
  mergeFeatureSegmentGroups,
  type MergedSegmentGroup,
} from "@main/lib/geojson/merge-segments.js";

export function segmentsToFeatureCollection(
  segments: GeoSegmentRecord[],
): ExportGeoJsonResult["geojson"] {
  return {
    type: "FeatureCollection",
    features: segments.map((segment) => ({
      type: "Feature",
      id: segment.id,
      geometry: segment.geometry,
      properties: {
        id: String(segment.id),
        name: segment.name ?? undefined,
        pathKind: segment.pathKind,
        source: "manual-trace",
        status: segment.status,
        confidence: segment.confidence ?? undefined,
        segmentGroupId: segment.segmentGroupId,
        segmentIndex: segment.segmentIndex,
        mapId: segment.mapId,
      },
    })),
  };
}

function mergedGroupToFeature(group: MergedSegmentGroup, mapId: number) {
  const primarySegmentId = group.sourceSegmentIds[0];
  if (primarySegmentId === undefined) {
    throw new Error("Merged segment group has no source segments.");
  }

  return {
    type: "Feature" as const,
    id: primarySegmentId,
    geometry: group.geometry,
    properties: {
      id: String(primarySegmentId),
      name: group.name ?? undefined,
      pathKind: group.pathKind,
      source: "manual-trace" as const,
      status: group.status,
      segmentGroupId: group.segmentGroupId,
      segmentIndex: 0,
      mapId,
      merged: true,
      sourceSegmentIds: group.sourceSegmentIds,
    },
  };
}

export function mergedGroupsToFeatureCollection(
  segments: GeoSegmentRecord[],
  options?: {
    segmentGroupId?: string;
    snapToleranceMeters?: number;
    mapId: number;
  },
): ExportGeoJsonResult["geojson"] {
  const { merged } = mergeFeatureSegmentGroups(segments, {
    segmentGroupId: options?.segmentGroupId,
    snapToleranceMeters: options?.snapToleranceMeters,
  });

  return {
    type: "FeatureCollection",
    features: merged.map((group) =>
      mergedGroupToFeature(group, options?.mapId ?? segments[0]?.mapId ?? 0),
    ),
  };
}
