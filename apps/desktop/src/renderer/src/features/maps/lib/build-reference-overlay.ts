import { mergeReferenceGeoJsonCollections } from "@repo/isomorphic/reference-geojson";
import type { ReferenceGeoJsonCollection } from "@repo/isomorphic/reference-geojson";
import type { MapReferenceGeoJsonLayer } from "@shared/reference-geojson.types";
import { getReferenceGeoJsonFeatureKey } from "@renderer/features/maps/lib/reference-geojson-feature-key";

export function buildReferenceOverlay(
  layers: MapReferenceGeoJsonLayer[],
  hiddenFeaturesByLayerId: Record<string, string[]>,
): ReferenceGeoJsonCollection | null {
  const filteredLayers = layers
    .filter((layer) => layer.visible)
    .map((layer) => {
      const hidden = new Set(hiddenFeaturesByLayerId[layer.id] ?? []);
      const features = layer.collection.features.filter((feature, index) => {
        const featureKey = getReferenceGeoJsonFeatureKey(layer.id, feature, index);
        return !hidden.has(featureKey);
      });
      if (features.length === 0) {
        return null;
      }
      return {
        type: "FeatureCollection" as const,
        features,
      };
    })
    .filter((collection): collection is ReferenceGeoJsonCollection => collection !== null);

  if (filteredLayers.length === 0) {
    return null;
  }

  return mergeReferenceGeoJsonCollections(filteredLayers);
}

export function countVisibleReferenceFeatures(
  layers: MapReferenceGeoJsonLayer[],
  hiddenFeaturesByLayerId: Record<string, string[]>,
) {
  let total = 0;
  for (const layer of layers) {
    if (!layer.visible) {
      continue;
    }
    const hidden = new Set(hiddenFeaturesByLayerId[layer.id] ?? []);
    for (const [index, feature] of layer.collection.features.entries()) {
      const featureKey = getReferenceGeoJsonFeatureKey(layer.id, feature, index);
      if (!hidden.has(featureKey)) {
        total += 1;
      }
    }
  }
  return total;
}
