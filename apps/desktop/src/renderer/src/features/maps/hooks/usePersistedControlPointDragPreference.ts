import { useEffect } from "react";
import { ipcInvoke } from "@renderer/hooks/useIpc";
import { useMapWorkspaceUiActions } from "@renderer/features/maps/store/MapWorkspaceProvider";

const CONTROL_POINT_DRAG_STORE_KEY = "maps.controlPointDragEnabled";

export function usePersistedControlPointDragPreference() {
  const { setControlPointDragEnabled } = useMapWorkspaceUiActions();

  useEffect(() => {
    void ipcInvoke("store:get", { key: CONTROL_POINT_DRAG_STORE_KEY }).then((value) => {
      if (typeof value === "boolean") {
        setControlPointDragEnabled(value);
      }
    });
  }, [setControlPointDragEnabled]);
}

export { CONTROL_POINT_DRAG_STORE_KEY };
