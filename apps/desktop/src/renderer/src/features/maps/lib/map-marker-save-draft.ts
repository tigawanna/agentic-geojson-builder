import {
  extractFeatureTags,
  featureDisplayName,
  partitionMapboxFeatures,
  pickPrimaryFeature,
} from "@renderer/features/maps/lib/mapbox-feature-utils";
import type { MapboxGlStyleId } from "@renderer/features/maps/lib/mapbox-gl-styles";
import type { MapboxFeatureProbe } from "@renderer/features/maps/lib/mapbox-probe.types";
import {
  REFERENCE_INSPECT_MAX_DISTANCE_METERS,
  type ReferenceInspectHover,
} from "@renderer/features/maps/lib/reference-inspect-tooltip";
import { findNearestPointOnGuides, type LineGuide } from "@repo/isomorphic/nearest-line-point";
import type { CreateMapPointInput, MapPointMetadata } from "@shared/map-points.types";
import type { MapboxGeoJSONFeature } from "mapbox-gl";

export type MapMarkerDraftTrailContext = {
  referenceHover?: ReferenceInspectHover | null;
  trailGuides?: LineGuide[];
  maxTrailDistanceMeters?: number;
};

export type MapMarkerSaveDraft = {
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  elevation: number | null;
  featureTags: Record<string, string>;
  layerId: string | null;
  sourceLayer: string | null;
  baseMapStyle: string | null;
};

function inferPathLabelFromMapboxFeatures(features: MapboxGeoJSONFeature[]): string | null {
  const { basemap } = partitionMapboxFeatures(features);
  for (const feature of basemap) {
    const geometryType = feature.geometry?.type;
    if (geometryType !== "LineString" && geometryType !== "MultiLineString") {
      continue;
    }
    const name = featureDisplayName(feature);
    const layerId = feature.layer?.id;
    if (name && name !== layerId && name !== "Feature") {
      return name;
    }
  }
  return null;
}

export function inferTrailNameAtCapture(
  latitude: number,
  longitude: number,
  context?: MapMarkerDraftTrailContext,
  probeFeatures?: MapboxGeoJSONFeature[],
): string | null {
  const maxDistanceMeters =
    context?.maxTrailDistanceMeters ?? REFERENCE_INSPECT_MAX_DISTANCE_METERS;

  if (
    context?.referenceHover &&
    context.referenceHover.nearest.distanceMeters <= maxDistanceMeters
  ) {
    return context.referenceHover.nearest.lineName;
  }

  if (context?.trailGuides && context.trailGuides.length > 0) {
    const nearest = findNearestPointOnGuides(latitude, longitude, context.trailGuides);
    if (nearest && nearest.distanceMeters <= maxDistanceMeters) {
      return nearest.lineName;
    }
  }

  if (probeFeatures && probeFeatures.length > 0) {
    return inferPathLabelFromMapboxFeatures(probeFeatures);
  }

  return null;
}

export function formatMapMarkerCaptureDescription(input: {
  trailName: string | null;
  latitude: number;
  longitude: number;
  elevationMeters: number | null;
}): string {
  const coords = `${input.latitude.toFixed(6)}, ${input.longitude.toFixed(6)}`;
  const elevationSuffix =
    input.elevationMeters != null ? ` · ${input.elevationMeters.toFixed(1)} m` : "";
  if (input.trailName) {
    return `${input.trailName} at ${coords}${elevationSuffix}`;
  }
  return `Captured at ${coords}${elevationSuffix}`;
}

export function buildMapMarkerDraftFromProbe(
  probe: NonNullable<MapboxFeatureProbe>,
  styleId: MapboxGlStyleId,
  trailContext?: MapMarkerDraftTrailContext,
): MapMarkerSaveDraft {
  const primary = pickPrimaryFeature(probe.features);
  const trailName = inferTrailNameAtCapture(
    probe.latitude,
    probe.longitude,
    trailContext,
    probe.features,
  );
  const description = formatMapMarkerCaptureDescription({
    trailName,
    latitude: probe.latitude,
    longitude: probe.longitude,
    elevationMeters: probe.elevationMeters,
  });

  return {
    name: primary ? featureDisplayName(primary) : "Map position",
    description,
    latitude: probe.latitude,
    longitude: probe.longitude,
    elevation: probe.elevationMeters,
    featureTags: extractFeatureTags(primary),
    layerId: primary?.layer?.id ?? null,
    sourceLayer: primary?.sourceLayer ?? null,
    baseMapStyle: styleId,
  };
}

export function mapMarkerDraftToCreateInput(
  mapId: number,
  draft: MapMarkerSaveDraft,
): CreateMapPointInput {
  const metadata: MapPointMetadata = { ...draft.featureTags };
  if (draft.layerId) {
    metadata.mapboxLayerId = draft.layerId;
  }
  if (draft.sourceLayer) {
    metadata.mapboxSourceLayer = draft.sourceLayer;
  }
  if (draft.baseMapStyle) {
    metadata.mapboxStyle = draft.baseMapStyle;
  }

  const trimmedName = draft.name.trim();

  return {
    mapId,
    latitude: draft.latitude,
    longitude: draft.longitude,
    name: trimmedName.length > 0 ? trimmedName : null,
    description: draft.description?.trim() || null,
    elevation: draft.elevation,
    elevationSource: draft.elevation != null ? "inferred_from_path" : null,
    category: "custom",
    metadata,
  };
}
