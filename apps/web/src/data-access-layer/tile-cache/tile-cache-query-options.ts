import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeyPrefixes } from "../query-keys";
import { unwrapUnknownError } from "@/utils/errors";
import {
  buildMapTileCacheFn,
  getMapTileCacheFn,
  setMapTileCacheBoundsFn,
} from "./tile-cache.functions";

type SetMapTileCacheBoundsInput = {
  mapId: number;
  centerLat: number;
  centerLng: number;
  halfSideMeters: number;
  minZoom?: number;
  maxZoom?: number;
  style?: "outline" | "standard" | "satellite";
};

export const getMapTileCacheQueryOptions = (mapId: number) =>
  queryOptions({
    queryKey: [queryKeyPrefixes.tileCache, mapId],
    queryFn: () => getMapTileCacheFn({ data: { mapId } }),
  });

export const setMapTileCacheBoundsMutationOptions = () =>
  mutationOptions({
    mutationFn: (input: SetMapTileCacheBoundsInput) => setMapTileCacheBoundsFn({ data: input }),
    onSuccess: (_config, variables, __, ctx) => {
      void ctx.client.invalidateQueries({
        queryKey: [queryKeyPrefixes.tileCache, variables.mapId],
      });
      toast.success("Tile cache area saved.");
    },
    onError: (error) => {
      toast.error(unwrapUnknownError(error).message);
    },
  });

export const buildMapTileCacheMutationOptions = () =>
  mutationOptions({
    mutationFn: (input: { mapId: number }) => buildMapTileCacheFn({ data: input }),
    onSuccess: (result, variables, __, ctx) => {
      void ctx.client.invalidateQueries({
        queryKey: [queryKeyPrefixes.tileCache, variables.mapId],
      });
      toast.success(`Pre-warmed ${result.downloadedCount} tiles.`, {
        description:
          result.failedCount > 0
            ? `${result.failedCount} failed · ${result.skippedCount} already cached`
            : result.skippedCount > 0
              ? `${result.skippedCount} already cached`
              : undefined,
      });
    },
    onError: (error) => {
      toast.error(unwrapUnknownError(error).message);
    },
  });
