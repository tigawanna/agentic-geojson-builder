import type {
  PlaygroundLayer,
  PlaygroundSelectedFeature,
} from "@renderer/types/map-playground.types";
import {
  coordinatesToLatLngs,
  getFeatureKey,
} from "@renderer/features/map-playground/lib/parse-playground-geojson";

export type PlaygroundViewport = {
  latitude: number;
  longitude: number;
  zoom: number;
};

export const DEFAULT_PLAYGROUND_VIEWPORT: PlaygroundViewport = {
  latitude: 0,
  longitude: 20,
  zoom: 2,
};

function isFeatureVisible(layer: PlaygroundLayer, featureKey: string): boolean {
  return layer.visible && !layer.hiddenFeatureKeys.includes(featureKey);
}

export function collectPlaygroundTrailBounds(
  layers: PlaygroundLayer[],
  selectedFeature: PlaygroundSelectedFeature | null,
): {
  allPoints: Array<{ latitude: number; longitude: number }>;
  selectedPoints: Array<{ latitude: number; longitude: number }> | null;
} {
  const allPoints: Array<{ latitude: number; longitude: number }> = [];
  let selectedPoints: Array<{ latitude: number; longitude: number }> | null = null;

  for (const layer of layers) {
    for (const feature of layer.features) {
      const featureKey = getFeatureKey(feature);
      if (!isFeatureVisible(layer, featureKey)) {
        continue;
      }
      const latlngs = coordinatesToLatLngs(feature.geometry.coordinates);
      for (const point of latlngs) {
        allPoints.push({ latitude: point.lat, longitude: point.lng });
      }
      const isSelected =
        selectedFeature?.layerId === layer.id && selectedFeature.featureKey === featureKey;
      if (isSelected && latlngs.length >= 2) {
        selectedPoints = latlngs.map((point) => ({
          latitude: point.lat,
          longitude: point.lng,
        }));
      }
    }
  }

  return { allPoints, selectedPoints };
}
