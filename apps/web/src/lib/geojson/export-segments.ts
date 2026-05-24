import type {
  ExportGeoJsonResult,
  GeoSegmentViewModel,
} from "@/data-access-layer/geo-segments/geo-segments.types";

export function segmentsToFeatureCollection(
  segments: GeoSegmentViewModel[],
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
