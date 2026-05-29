import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useIpcQuery } from "@renderer/hooks/useIpc";
import { useIpcEvent } from "@renderer/hooks/useIpcEvent";

export function useGeoSegmentsQuery(mapId: number | null) {
  const queryClient = useQueryClient();

  const handleGeoSegmentsChanged = useCallback(
    (event: { mapId: number }) => {
      if (mapId != null && event.mapId === mapId) {
        void queryClient.invalidateQueries({ queryKey: ["geoSegments:list", { mapId }] });
      }
    },
    [mapId, queryClient],
  );

  useIpcEvent("geoSegments:changed", handleGeoSegmentsChanged);

  return useIpcQuery(
    "geoSegments:list",
    { mapId: mapId ?? 0 },
    { enabled: mapId != null, staleTime: 0, refetchOnMount: "always" },
  );
}
