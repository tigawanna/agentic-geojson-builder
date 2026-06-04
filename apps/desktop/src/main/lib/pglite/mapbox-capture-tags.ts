import {
  MAPBOX_CAPTURE_DESCRIPTION_TAG,
  type MapboxCaptureTags,
} from "@shared/mapbox-capture.types.js";

export function splitMapboxCaptureTags(tags: MapboxCaptureTags): {
  description: string | null;
  featureTags: MapboxCaptureTags;
} {
  const { [MAPBOX_CAPTURE_DESCRIPTION_TAG]: description, ...featureTags } = tags;
  if (typeof description !== "string") {
    return { description: null, featureTags };
  }
  const trimmed = description.trim();
  return { description: trimmed.length > 0 ? trimmed : null, featureTags };
}

export function mergeMapboxCaptureTags(
  featureTags: MapboxCaptureTags,
  description: string | null | undefined,
): MapboxCaptureTags {
  const trimmed = description?.trim() ?? "";
  if (trimmed.length === 0) {
    return featureTags;
  }
  return { ...featureTags, [MAPBOX_CAPTURE_DESCRIPTION_TAG]: trimmed };
}
