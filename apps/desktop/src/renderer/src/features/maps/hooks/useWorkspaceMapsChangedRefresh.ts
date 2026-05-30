import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useIpcEvent } from "@renderer/hooks/useIpcEvent";
import {
  fetchMapWorkspace,
  mapWorkspaceQueryKeys,
} from "@renderer/features/maps/hooks/map-workspace-api";
import { useMapWorkspaceActions } from "@renderer/features/maps/store/MapWorkspaceProvider";

export function useWorkspaceMapsChangedRefresh(mapId: number | null) {
  const queryClient = useQueryClient();
  const { setWorkspace } = useMapWorkspaceActions();

  useIpcEvent("maps:changed", (event) => {
    if (!mapId || event.mapId !== mapId) {
      return;
    }

    void queryClient.invalidateQueries({ queryKey: mapWorkspaceQueryKeys.workspace(mapId) });
    void fetchMapWorkspace(mapId).then((nextWorkspace) => {
      if (nextWorkspace) {
        setWorkspace(nextWorkspace);
      }
    });
  });

  useEffect(() => {
    if (!mapId) {
      return;
    }

    return () => {
      void queryClient.invalidateQueries({ queryKey: mapWorkspaceQueryKeys.workspace(mapId) });
    };
  }, [mapId, queryClient]);
}
