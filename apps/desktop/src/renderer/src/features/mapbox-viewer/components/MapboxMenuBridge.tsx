import { MAPBOX_GL_STYLE_ORDER, type MapboxGlStyleId } from "@shared/mapbox-menu.types";
import { useMapboxViewerUiStore } from "@renderer/features/mapbox-viewer/store/mapbox-viewer-ui-store";
import { useIpcEvent } from "@renderer/hooks/useIpcEvent";
import { useNavigate, useRouterState } from "@tanstack/react-router";

function isMapboxViewerRoute(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, "") || "/";
  return normalized === "/mapbox";
}

function isMapboxStyleId(value: string): value is MapboxGlStyleId {
  return (MAPBOX_GL_STYLE_ORDER as readonly string[]).includes(value);
}

export function MapboxMenuBridge() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useIpcEvent("app:menuAction", (action) => {
    if (action.type !== "mapbox-menu") {
      return;
    }

    const store = useMapboxViewerUiStore.getState();

    if (action.id === "open-collection") {
      void navigate({ to: "/mapbox/captures" });
      return;
    }

    if (!isMapboxViewerRoute(pathname)) {
      void navigate({ to: "/mapbox" });
    }

    if (action.id === "inspect-mode") {
      store.toggleInspectMode();
      return;
    }

    if (action.id === "show-pending") {
      store.toggleShowPendingCaptures();
      return;
    }

    if (action.id === "show-approved") {
      store.toggleShowApprovedCaptures();
      return;
    }

    if (action.id.startsWith("style:")) {
      const styleId = action.id.slice("style:".length);
      if (isMapboxStyleId(styleId)) {
        store.setStyleId(styleId);
      }
    }
  });

  return null;
}
