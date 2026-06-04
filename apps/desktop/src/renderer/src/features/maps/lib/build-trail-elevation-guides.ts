import type { GeoCoordinate } from "@repo/isomorphic/elevation-at-point";
import type { LineGuide } from "@repo/isomorphic/nearest-line-point";
import type { GeoSegmentRecord } from "@shared/geo-segments.types";
import type { ReferenceGeoJsonCollection } from "@repo/isomorphic/reference-geojson";

export function buildTrailElevationGuides(input: {
  geoSegments: GeoSegmentRecord[];
  referenceOverlay: ReferenceGeoJsonCollection | null;
}): LineGuide[] {
  const guides: LineGuide[] = [];

  for (const segment of input.geoSegments) {
    if ((segment.geometry?.coordinates?.length ?? 0) < 2) {
      continue;
    }
    guides.push({
      id: `segment-${segment.id}`,
      name: segment.name ?? segment.segmentGroupId,
      coordinates: segment.geometry.coordinates as GeoCoordinate[],
    });
  }

  if (input.referenceOverlay) {
    for (const feature of input.referenceOverlay.features) {
      if (feature.geometry.coordinates.length < 2) {
        continue;
      }
      const featureName =
        typeof feature.properties.name === "string" ? feature.properties.name : "Reference line";
      guides.push({
        id: `ref-${featureName}`,
        name: featureName,
        coordinates: feature.geometry.coordinates as GeoCoordinate[],
      });
    }
  }

  return guides;
}
