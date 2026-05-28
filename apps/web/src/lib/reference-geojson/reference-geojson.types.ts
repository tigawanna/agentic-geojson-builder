export type {
  ReferenceGeoJsonCollection,
  ReferenceGeoJsonFeature,
  ReferenceGeoJsonLineString,
} from "@repo/isomorphic/reference-geojson";

export type MapReferenceGeoJsonRecord = {
  id: string;
  mapId: number;
  name: string;
  fileName: string;
  importedAt: string;
  visible: boolean;
  featureCount: number;
  collection: import("@repo/isomorphic/reference-geojson").ReferenceGeoJsonCollection;
};
