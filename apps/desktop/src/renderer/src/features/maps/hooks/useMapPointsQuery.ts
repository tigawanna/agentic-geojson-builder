import { useQueryClient } from "@tanstack/react-query";
import { useIpcQuery } from "@renderer/hooks/useIpc";
import { useIpcEvent } from "@renderer/hooks/useIpcEvent";

export function useMapPointsQuery(mapId: number | null) {
  const queryClient = useQueryClient();

  useIpcEvent("mapPoints:changed", (event) => {
    if (mapId != null && event.mapId === mapId) {
      void queryClient.invalidateQueries({ queryKey: ["mapPoints:list", { mapId }] });
    }
  });

  return useIpcQuery(
    "mapPoints:list",
    { mapId: mapId ?? 0 },
    { enabled: mapId != null, staleTime: 0, refetchOnMount: "always" },
  );
}
