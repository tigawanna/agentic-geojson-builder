import { useEffect, useState } from "react";
import { ipcInvoke } from "@renderer/hooks/useIpc";
import {
  MAP_WORKSPACE_LAYOUT_STORE_KEY,
  parsePersistedMapWorkspaceLayout,
  type PersistedMapWorkspaceLayout,
} from "@renderer/lib/ui-layout-storage";
import {
  useMapWorkspaceUiActions,
  useMapWorkspaceUiState,
} from "@renderer/features/maps/store/MapWorkspaceProvider";

export function usePersistedMapWorkspaceLayout() {
  const mapPanelCollapsed = useMapWorkspaceUiState((state) => state.mapPanelCollapsed);
  const sourcePanelPresentation = useMapWorkspaceUiState((state) => state.sourcePanelPresentation);
  const { setMapPanelCollapsed, setSourcePanelPresentation } = useMapWorkspaceUiActions();
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    void ipcInvoke("store:get", { key: MAP_WORKSPACE_LAYOUT_STORE_KEY }).then((value) => {
      const layout = parsePersistedMapWorkspaceLayout(value);
      if (layout?.mapPanelCollapsed !== undefined) {
        setMapPanelCollapsed(layout.mapPanelCollapsed);
      }
      if (layout?.sourcePanelPresentation !== undefined) {
        setSourcePanelPresentation(layout.sourcePanelPresentation);
      }
      setHasLoaded(true);
    });
  }, [setMapPanelCollapsed, setSourcePanelPresentation]);

  useEffect(() => {
    if (!hasLoaded) {
      return;
    }

    const layout: PersistedMapWorkspaceLayout = {
      mapPanelCollapsed,
      sourcePanelPresentation,
    };
    void ipcInvoke("store:set", { key: MAP_WORKSPACE_LAYOUT_STORE_KEY, value: layout });
  }, [hasLoaded, mapPanelCollapsed, sourcePanelPresentation]);
}
