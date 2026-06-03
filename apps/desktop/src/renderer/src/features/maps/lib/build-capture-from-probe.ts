import {
  extractFeatureTags,
  featureDisplayName,
  pickPrimaryFeature,
} from "@renderer/features/maps/lib/mapbox-feature-utils";
import type { MapboxGlStyleId } from "@renderer/features/maps/lib/mapbox-gl-styles";
import type { MapboxFeatureProbe } from "@renderer/features/maps/lib/mapbox-probe.types";
import type { CreateMapboxGroundCaptureInput } from "@shared/mapbox-capture.types";

export function buildCaptureFromProbe(
  probe: NonNullable<MapboxFeatureProbe>,
  styleId: MapboxGlStyleId,
): CreateMapboxGroundCaptureInput {
  const primary = pickPrimaryFeature(probe.features);

  return {
    title: primary ? featureDisplayName(primary) : "Map position",
    tags: extractFeatureTags(primary),
    latitude: probe.latitude,
    longitude: probe.longitude,
    elevation: probe.elevationMeters,
    layerId: primary?.layer?.id ?? null,
    sourceLayer: primary?.sourceLayer ?? null,
    baseMapStyle: styleId,
  };
}
