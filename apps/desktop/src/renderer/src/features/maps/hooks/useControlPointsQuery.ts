import { useQueryClient } from "@tanstack/react-query";
import { useIpcQuery } from "../../../hooks/useIpc";
import { useIpcEvent } from "../../../hooks/useIpcEvent";

export function useControlPointsQuery(mapId: number | null) {
  const queryClient = useQueryClient();

  useIpcEvent("controlPoints:changed", (event) => {
    if (mapId != null && event.mapId === mapId) {
      void queryClient.invalidateQueries({ queryKey: ["controlPoints:list", { mapId }] });
    }
  });

  return useIpcQuery(
    "controlPoints:list",
    { mapId: mapId ?? 0 },
    { enabled: mapId != null, staleTime: 30_000 },
  );
}
