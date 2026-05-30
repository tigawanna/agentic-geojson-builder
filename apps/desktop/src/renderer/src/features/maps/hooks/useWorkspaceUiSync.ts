import { useEffect } from "react";
import { ipcInvoke } from "@renderer/hooks/useIpc";
import { useIpcEvent } from "@renderer/hooks/useIpcEvent";
import {
  useMapWorkspaceUiActions,
  useMapWorkspaceUiState,
} from "@renderer/features/maps/store/MapWorkspaceProvider";

export function useWorkspaceUiSyncPublisher(mapId: number | null) {
  const referenceMode = useMapWorkspaceUiState((state) => state.referenceMode);
  const pendingMapPoint = useMapWorkspaceUiState((state) => state.pendingMapPoint);
  const selectedControlPointId = useMapWorkspaceUiState((state) => state.selectedControlPointId);
  const sourcePanelPresentation = useMapWorkspaceUiState((state) => state.sourcePanelPresentation);

  useEffect(() => {
    if (!mapId) {
      return;
    }

    void ipcInvoke("workspace:publishUiSync", {
      mapId,
      state: {
        mapId,
        referenceMode,
        pendingMapPoint,
        selectedControlPointId,
      },
    });
  }, [mapId, pendingMapPoint, referenceMode, selectedControlPointId, sourcePanelPresentation]);
}

export function useWorkspaceUiSyncSubscriber(mapId: number | null) {
  const { setReferenceMode, setPendingMapPoint, setSelectedControlPointId } =
    useMapWorkspaceUiActions();

  useEffect(() => {
    if (!mapId) {
      return;
    }

    void ipcInvoke("workspace:getUiSync", { mapId }).then(({ state }) => {
      if (!state || state.mapId !== mapId) {
        return;
      }
      setReferenceMode(state.referenceMode);
      setPendingMapPoint(state.pendingMapPoint);
      setSelectedControlPointId(state.selectedControlPointId);
    });
  }, [mapId, setPendingMapPoint, setReferenceMode, setSelectedControlPointId]);

  useIpcEvent("workspace:uiSync", (state) => {
    if (!mapId || state.mapId !== mapId) {
      return;
    }
    setReferenceMode(state.referenceMode);
    setPendingMapPoint(state.pendingMapPoint);
    setSelectedControlPointId(state.selectedControlPointId);
  });
}
