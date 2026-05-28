import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { MapBaseMapStyle } from "@shared/maps.types";
import type { TileCacheCorner } from "@shared/tile-cache.types";
import { tileCacheQueryKeys } from "@renderer/features/maps/hooks/tile-cache-api";

type BuildTileCacheInput = {
  mapId: number;
  corners: TileCacheCorner[];
  style: MapBaseMapStyle;
  minZoom?: number;
  maxZoom?: number;
};

export function useBuildTileCacheMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mapId, corners, style, minZoom, maxZoom }: BuildTileCacheInput) => {
      await window.api.invoke("tileCache:setBoundsFromCorners", {
        mapId,
        corners,
        style,
        minZoom,
        maxZoom,
      });
      return window.api.invoke("tileCache:build", { mapId });
    },
    onSuccess: (result) => {
      queryClient.setQueryData(tileCacheQueryKeys.status(result.config.mapId), result.config);
    },
  });
}
