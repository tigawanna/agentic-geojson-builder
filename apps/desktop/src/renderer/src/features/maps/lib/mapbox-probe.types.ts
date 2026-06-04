import type { InspectElevationSource } from "@renderer/features/maps/lib/resolve-inspect-elevation";
import type { MapboxGeoJSONFeature } from "mapbox-gl";

export type MapboxFeatureProbe = {
  features: MapboxGeoJSONFeature[];
  latitude: number;
  longitude: number;
  elevationMeters: number | null;
  elevationSource: InspectElevationSource | null;
  clientX: number;
  clientY: number;
};
