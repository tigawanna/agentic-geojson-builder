import { useQueryClient } from "@tanstack/react-query";
import { useIpcQuery } from "@renderer/hooks/useIpc";
import { useIpcEvent } from "@renderer/hooks/useIpcEvent";

export function useMapLinksQuery(mapId: number | null) {
  const queryClient = useQueryClient();

  useIpcEvent("mapLinks:changed", (event) => {
    if (mapId != null && event.mapId === mapId) {
      void queryClient.invalidateQueries({ queryKey: ["mapLinks:list", { mapId }] });
    }
  });

  return useIpcQuery(
    "mapLinks:list",
    { mapId: mapId ?? 0 },
    { enabled: mapId != null, staleTime: 0, refetchOnMount: "always" },
  );
}
