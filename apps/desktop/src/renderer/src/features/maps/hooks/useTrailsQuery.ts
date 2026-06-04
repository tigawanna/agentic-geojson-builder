import { useQueryClient } from "@tanstack/react-query";
import { useIpcQuery } from "@renderer/hooks/useIpc";
import { useIpcEvent } from "@renderer/hooks/useIpcEvent";

export function useTrailsQuery(mapId: number | null) {
  const queryClient = useQueryClient();

  useIpcEvent("trails:changed", (event) => {
    if (mapId != null && event.mapId === mapId) {
      void queryClient.invalidateQueries({ queryKey: ["trails:list", { mapId }] });
    }
  });

  return useIpcQuery(
    "trails:list",
    { mapId: mapId ?? 0 },
    { enabled: mapId != null, staleTime: 0, refetchOnMount: "always" },
  );
}
