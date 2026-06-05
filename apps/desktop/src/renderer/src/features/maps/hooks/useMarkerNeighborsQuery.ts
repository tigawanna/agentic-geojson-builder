import { useQueryClient } from "@tanstack/react-query";
import { useIpcQuery } from "@renderer/hooks/useIpc";
import { useIpcEvent } from "@renderer/hooks/useIpcEvent";

export function useMarkerNeighborsQuery(mapId: number | null) {
  const queryClient = useQueryClient();

  useIpcEvent("markerNeighbors:changed", (event) => {
    if (mapId != null && event.mapId === mapId) {
      void queryClient.invalidateQueries({ queryKey: ["markerNeighbors:list", { mapId }] });
    }
  });

  return useIpcQuery(
    "markerNeighbors:list",
    { mapId: mapId ?? 0 },
    { enabled: mapId != null, staleTime: 0, refetchOnMount: "always" },
  );
}
