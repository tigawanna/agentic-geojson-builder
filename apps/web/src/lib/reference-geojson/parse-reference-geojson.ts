import type { ReferenceGeoJsonCollection } from "@repo/isomorphic/reference-geojson";
import {
  mergeReferenceGeoJsonCollections,
  parseReferenceGeoJsonCollection,
  parseReferenceGeoJsonText,
} from "@repo/isomorphic/reference-geojson";

export { mergeReferenceGeoJsonCollections, parseReferenceGeoJsonCollection };

export function readReferenceGeoJsonFile(file: File): Promise<ReferenceGeoJsonCollection> {
  if (file.size > 12 * 1024 * 1024) {
    return Promise.reject(new Error("GeoJSON file must be 12 MB or smaller."));
  }

  return file.text().then((text) => parseReferenceGeoJsonText(text, file.size));
}
