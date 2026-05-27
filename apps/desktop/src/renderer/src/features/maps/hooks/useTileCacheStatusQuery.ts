import { useQuery } from "@tanstack/react-query";
import { fetchTileCacheStatus, tileCacheQueryKeys } from "./tile-cache-api";

export function useTileCacheStatusQuery(mapId: number | null) {
  return useQuery({
    queryKey: tileCacheQueryKeys.status(mapId ?? 0),
    queryFn: () => fetchTileCacheStatus(mapId!),
    enabled: mapId != null,
  });
}
