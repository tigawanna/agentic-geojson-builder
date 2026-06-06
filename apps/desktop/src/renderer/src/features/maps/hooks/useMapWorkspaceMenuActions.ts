import { ipcInvoke } from "@renderer/hooks/useIpc";
import { useIpcEvent } from "@renderer/hooks/useIpcEvent";
import { CONTROL_POINT_DRAG_STORE_KEY } from "@renderer/features/maps/hooks/usePersistedControlPointDragPreference";
import { NEIGHBOR_COVERAGE_STORE_KEY } from "@renderer/features/maps/hooks/usePersistedNeighborCoveragePreference";
import { useMapWorkspaceUiStore } from "@renderer/features/maps/store/MapWorkspaceProvider";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useRef } from "react";
import {
  MAPBOX_GL_STYLE_ORDER,
  type MapboxGlStyleId,
} from "@renderer/features/maps/lib/mapbox-gl-styles";

const REFERENCE_INSPECT_TOOLTIP_STORE_KEY = "maps.referenceInspectTooltip";

type MapWorkspaceMenuHandlers = {
  mapId: number;
  hasSourceFile: boolean;
  onPreviewGeoJson: () => void;
  onExportGeoJson: () => void;
  onOpenControls: () => void;
  onOpenHistory: () => void;
  onOpenGuide: () => void;
  onHardReload: () => void;
  onSetMapboxGlStyle: (styleId: MapboxGlStyleId) => void;
};

export function useMapWorkspaceMenuActions(handlers: MapWorkspaceMenuHandlers) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const uiStore = useMapWorkspaceUiStore();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useIpcEvent("app:menuAction", (action) => {
    if (action.type === "workspace-quick-menu-toggle") {
      const state = uiStore.getState();
      if (action.id === "reference-overlay") {
        state.setShowReferenceOverlay(!state.showReferenceOverlay);
        return;
      }
      if (action.id === "reference-inspect-tooltip") {
        const next = !state.showReferenceInspectTooltip;
        state.setShowReferenceInspectTooltip(next);
        void ipcInvoke("store:set", { key: REFERENCE_INSPECT_TOOLTIP_STORE_KEY, value: next });
        return;
      }
      if (action.id === "control-point-drag") {
        const next = !state.controlPointDragEnabled;
        state.setControlPointDragEnabled(next);
        void ipcInvoke("store:set", { key: CONTROL_POINT_DRAG_STORE_KEY, value: next });
      }
      return;
    }

    if (action.type !== "map-workspace-menu") {
      return;
    }

    const state = uiStore.getState();
    const currentHandlers = handlersRef.current;

    if (action.id === "toggle-tools-panel") {
      state.toggleToolsPanel();
      return;
    }

    if (action.id === "open-export-page") {
      void navigate({
        to: "/maps/$mapId/export",
        params: { mapId: String(currentHandlers.mapId) },
      });
      return;
    }

    if (action.id === "preview-geojson") {
      currentHandlers.onPreviewGeoJson();
      return;
    }

    if (action.id === "export-geojson") {
      currentHandlers.onExportGeoJson();
      return;
    }

    if (action.id === "open-controls") {
      currentHandlers.onOpenControls();
      return;
    }

    if (action.id === "open-history") {
      currentHandlers.onOpenHistory();
      return;
    }

    if (action.id === "show-guide") {
      currentHandlers.onOpenGuide();
      return;
    }

    if (action.id === "hard-reload") {
      currentHandlers.onHardReload();
      return;
    }

    if (action.id === "reference-overlay") {
      state.setShowReferenceOverlay(!state.showReferenceOverlay);
      return;
    }

    if (action.id === "reference-inspect-tooltip") {
      const next = !state.showReferenceInspectTooltip;
      state.setShowReferenceInspectTooltip(next);
      void ipcInvoke("store:set", { key: REFERENCE_INSPECT_TOOLTIP_STORE_KEY, value: next });
      return;
    }

    if (action.id === "control-point-drag") {
      const next = !state.controlPointDragEnabled;
      state.setControlPointDragEnabled(next);
      void ipcInvoke("store:set", { key: CONTROL_POINT_DRAG_STORE_KEY, value: next });
      return;
    }

    if (action.id === "neighbor-coverage") {
      const next = !state.showNeighborCoverage;
      state.setShowNeighborCoverage(next);
      void ipcInvoke("store:set", { key: NEIGHBOR_COVERAGE_STORE_KEY, value: next });
      return;
    }

    if (action.id === "neighbor-link-arrows") {
      state.toggleShowNeighborLinkArrows();
      return;
    }

    if (action.id.startsWith("mapbox-style:")) {
      const styleId = action.id.slice("mapbox-style:".length);
      if ((MAPBOX_GL_STYLE_ORDER as readonly string[]).includes(styleId)) {
        currentHandlers.onSetMapboxGlStyle(styleId as MapboxGlStyleId);
      }
      return;
    }

    if (action.id === "mapbox-inspect") {
      state.toggleMapboxInspectMode();
      return;
    }

    if (action.id === "reference-mode") {
      if (state.referenceMode) {
        state.stopReferenceMode();
        state.setStatusMessage(null);
        return;
      }
      state.stopTraceMode();
      state.setReferenceMode(true);
      state.setPendingMapPoint(null);
      return;
    }

    if (action.id === "trace-mode") {
      if (state.traceMode) {
        state.stopTraceMode();
        state.setStatusMessage(null);
        return;
      }
      state.stopReferenceMode();
      state.setTraceMode(true);
      return;
    }

    if (action.id === "marker-mode") {
      if (state.markerMode) {
        state.stopMarkerMode();
        state.setStatusMessage(null);
        return;
      }
      state.stopReferenceMode();
      state.stopTraceMode();
      state.stopLinkMode();
      state.setMarkerMode(true);
      state.setStatusMessage(t("maps.workspace.markerHint"));
      return;
    }

    if (action.id === "link-mode") {
      if (state.linkMode) {
        state.stopLinkMode();
        state.setStatusMessage(null);
        return;
      }
      state.stopReferenceMode();
      state.stopTraceMode();
      state.stopMarkerMode();
      state.setLinkMode(true);
      state.setStatusMessage(t("maps.workspace.linkComposer.hint"));
    }
  });
}
