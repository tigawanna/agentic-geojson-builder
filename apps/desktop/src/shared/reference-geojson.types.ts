import type { ReferenceGeoJsonCollection } from "@repo/isomorphic/reference-geojson";

export type MapReferenceGeoJsonLayer = {
  id: string;
  mapId: number;
  name: string;
  fileName: string;
  importedAt: string;
  visible: boolean;
  featureCount: number;
  collection: ReferenceGeoJsonCollection;
};

export type ListMapReferenceGeoJsonResult = {
  layers: MapReferenceGeoJsonLayer[];
};

export type ImportMapReferenceGeoJsonInput = {
  mapId: number;
  fileName: string;
  fileBase64: string;
};

export type ImportMapReferenceGeoJsonResult = {
  layer: MapReferenceGeoJsonLayer;
};

export type DeleteMapReferenceGeoJsonInput = {
  mapId: number;
  layerId: string;
};

export type SetMapReferenceGeoJsonVisibilityInput = {
  mapId: number;
  layerId: string;
  visible: boolean;
};

export type ReferenceGeoJsonChangedEvent = {
  mapId: number;
  reason: "imported" | "deleted" | "visibility";
  layerId?: string;
};
