import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { unwrapUnknownError } from "@/utils/errors";
import {
  deleteMapReferenceGeoJson,
  listMapReferenceGeoJson,
  saveMapReferenceGeoJson,
  setMapReferenceGeoJsonVisibility,
} from "./reference-geojson-storage";
import type { MapReferenceGeoJsonRecord } from "./reference-geojson.types";

export const mapReferenceGeoJsonQueryOptions = (mapId: number) =>
  queryOptions({
    queryKey: [queryKeyPrefixes.referenceTrails, "local", mapId],
    queryFn: () => listMapReferenceGeoJson(mapId),
    staleTime: Number.POSITIVE_INFINITY,
  });

export const importMapReferenceGeoJsonMutationOptions = (mapId: number) =>
  mutationOptions({
    mutationFn: async (input: { file: File }) => {
      const { readReferenceGeoJsonFile } = await import("./parse-reference-geojson");
      const layerId = crypto.randomUUID();
      const layerName = input.file.name.replace(/\.(geo)?json$/i, "");
      const collection = await readReferenceGeoJsonFile(input.file);
      const taggedCollection: MapReferenceGeoJsonRecord["collection"] = {
        type: "FeatureCollection",
        features: collection.features.map((feature) => ({
          ...feature,
          properties: {
            ...feature.properties,
            referenceLayerId: layerId,
            referenceLayerName: layerName,
          },
        })),
      };
      const record: MapReferenceGeoJsonRecord = {
        id: layerId,
        mapId,
        name: layerName,
        fileName: input.file.name,
        importedAt: new Date().toISOString(),
        visible: true,
        featureCount: taggedCollection.features.length,
        collection: taggedCollection,
      };
      await saveMapReferenceGeoJson(record);
      return record;
    },
    onSuccess: (record, _, __, ctx) => {
      void ctx.client.invalidateQueries({
        queryKey: mapReferenceGeoJsonQueryOptions(mapId).queryKey,
      });
      toast.success(`Reference GeoJSON added (${record.featureCount} lines)`);
    },
    onError: (error: unknown) => {
      toast.error("Could not import reference GeoJSON", {
        description: unwrapUnknownError(error).message,
      });
    },
  });

export const deleteMapReferenceGeoJsonMutationOptions = (mapId: number) =>
  mutationOptions({
    mutationFn: (id: string) => deleteMapReferenceGeoJson(id),
    onSuccess: (_, __, ___, ctx) => {
      void ctx.client.invalidateQueries({
        queryKey: mapReferenceGeoJsonQueryOptions(mapId).queryKey,
      });
      toast.success("Reference GeoJSON removed");
    },
    onError: (error: unknown) => {
      toast.error("Could not remove reference GeoJSON", {
        description: unwrapUnknownError(error).message,
      });
    },
  });

export const setMapReferenceGeoJsonVisibilityMutationOptions = (mapId: number) =>
  mutationOptions({
    mutationFn: (input: { id: string; visible: boolean }) =>
      setMapReferenceGeoJsonVisibility(input.id, input.visible),
    onSuccess: (_, __, ___, ctx) => {
      void ctx.client.invalidateQueries({
        queryKey: mapReferenceGeoJsonQueryOptions(mapId).queryKey,
      });
    },
    onError: (error: unknown) => {
      toast.error("Could not update reference layer", {
        description: unwrapUnknownError(error).message,
      });
    },
  });
