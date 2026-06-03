import type { MapboxGeoJSONFeature } from "mapbox-gl";

export type MapboxFeatureProbe = {
  features: MapboxGeoJSONFeature[];
  latitude: number;
  longitude: number;
  elevationMeters: number | null;
  clientX: number;
  clientY: number;
};
