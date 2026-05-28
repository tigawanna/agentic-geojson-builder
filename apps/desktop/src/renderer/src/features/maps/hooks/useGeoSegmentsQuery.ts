import { useQueryClient } from "@tanstack/react-query";
import { useIpcQuery } from "@renderer/hooks/useIpc";
import { useIpcEvent } from "@renderer/hooks/useIpcEvent";

export function useGeoSegmentsQuery(mapId: number | null) {
  const queryClient = useQueryClient();

  useIpcEvent("geoSegments:changed", (event) => {
    if (mapId != null && event.mapId === mapId) {
      void queryClient.invalidateQueries({ queryKey: ["geoSegments:list", { mapId }] });
    }
  });

  return useIpcQuery(
    "geoSegments:list",
    { mapId: mapId ?? 0 },
    { enabled: mapId != null, staleTime: 30_000 },
  );
}
