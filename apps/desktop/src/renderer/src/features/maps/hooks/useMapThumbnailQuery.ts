import { useQuery } from "@tanstack/react-query";
import { mapsQueryKeys } from "../maps-query-keys";
import { fileBase64ToDataUrl } from "../hooks/map-workspace-api";

export const mapThumbnailQueryKeys = {
  thumbnail: (mapId: number) => [...mapsQueryKeys.all, "thumbnail", mapId] as const,
};

export function useMapThumbnailQuery(mapId: number, enabled: boolean) {
  return useQuery({
    queryKey: mapThumbnailQueryKeys.thumbnail(mapId),
    queryFn: async () => {
      const payload = await window.api.invoke("maps:readThumbnail", { mapId });
      if (!payload) {
        return null;
      }
      return fileBase64ToDataUrl(payload.mimeType, payload.fileBase64);
    },
    enabled,
    staleTime: Infinity,
  });
}
