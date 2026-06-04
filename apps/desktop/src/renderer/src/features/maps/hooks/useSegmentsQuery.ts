import { useQueryClient } from "@tanstack/react-query";
import { useIpcQuery } from "@renderer/hooks/useIpc";
import { useIpcEvent } from "@renderer/hooks/useIpcEvent";

export function useSegmentsQuery(mapId: number | null) {
  const queryClient = useQueryClient();

  useIpcEvent("segments:changed", (event) => {
    if (mapId != null && event.mapId === mapId) {
      void queryClient.invalidateQueries({ queryKey: ["segments:list", { mapId }] });
      void queryClient.invalidateQueries({ queryKey: ["mapLinks:list", { mapId }] });
    }
  });

  useIpcEvent("mapLinks:changed", (event) => {
    if (mapId != null && event.mapId === mapId) {
      void queryClient.invalidateQueries({ queryKey: ["segments:list", { mapId }] });
      void queryClient.invalidateQueries({ queryKey: ["mapLinks:list", { mapId }] });
    }
  });

  return useIpcQuery(
    "segments:list",
    { mapId: mapId ?? 0 },
    { enabled: mapId != null, staleTime: 0, refetchOnMount: "always" },
  );
}
