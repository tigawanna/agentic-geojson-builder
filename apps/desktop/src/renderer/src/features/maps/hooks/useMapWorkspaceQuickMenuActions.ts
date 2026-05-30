import type { MapWorkspaceQuickMenuItemId } from "@shared/menu.types";
import { ipcInvoke } from "@renderer/hooks/useIpc";
import { useIpcEvent } from "@renderer/hooks/useIpcEvent";
import { CONTROL_POINT_DRAG_STORE_KEY } from "@renderer/features/maps/hooks/usePersistedControlPointDragPreference";
import { useMapWorkspaceUiStore } from "@renderer/features/maps/store/MapWorkspaceProvider";

const REFERENCE_INSPECT_TOOLTIP_STORE_KEY = "maps.referenceInspectTooltip";

export function useMapWorkspaceQuickMenuActions() {
  const uiStore = useMapWorkspaceUiStore();

  useIpcEvent("app:menuAction", (action) => {
    if (action.type !== "workspace-quick-menu-toggle") {
      return;
    }

    const state = uiStore.getState();
    const toggleId: MapWorkspaceQuickMenuItemId = action.id;

    if (toggleId === "reference-overlay") {
      state.setShowReferenceOverlay(!state.showReferenceOverlay);
      return;
    }
    if (toggleId === "reference-inspect-tooltip") {
      const next = !state.showReferenceInspectTooltip;
      state.setShowReferenceInspectTooltip(next);
      void ipcInvoke("store:set", { key: REFERENCE_INSPECT_TOOLTIP_STORE_KEY, value: next });
      return;
    }
    if (toggleId === "control-point-drag") {
      const next = !state.controlPointDragEnabled;
      state.setControlPointDragEnabled(next);
      void ipcInvoke("store:set", { key: CONTROL_POINT_DRAG_STORE_KEY, value: next });
    }
  });
}
