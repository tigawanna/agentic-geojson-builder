import type { ReferenceGeoJsonFeature } from "@repo/isomorphic/reference-geojson";

export function getReferenceGeoJsonFeatureKey(
  layerId: string,
  feature: ReferenceGeoJsonFeature,
  index: number,
) {
  for (const propertyKey of ["name", "title", "label", "slug", "id"]) {
    const value = feature.properties[propertyKey];
    if (typeof value === "string" && value.length > 0) {
      return `${layerId}:${value}`;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return `${layerId}:${String(value)}`;
    }
  }
  return `${layerId}:feature-${index}`;
}
