import { useQueryClient } from "@tanstack/react-query";
import { useIpcQuery } from "@renderer/hooks/useIpc";
import { useIpcEvent } from "@renderer/hooks/useIpcEvent";

export function useReferenceGeoJsonQuery(mapId: number | null) {
  const queryClient = useQueryClient();

  useIpcEvent("referenceGeoJson:changed", (event) => {
    if (mapId != null && event.mapId === mapId) {
      void queryClient.invalidateQueries({ queryKey: ["referenceGeoJson:list", { mapId }] });
    }
  });

  return useIpcQuery(
    "referenceGeoJson:list",
    { mapId: mapId ?? 0 },
    { enabled: mapId != null, staleTime: Number.POSITIVE_INFINITY },
  );
}
