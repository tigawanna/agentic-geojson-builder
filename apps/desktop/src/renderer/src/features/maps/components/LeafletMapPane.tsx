import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { MapWorkspaceState } from "@shared/maps.types";
import {
  createBaseLayer,
  createMapHandle,
  DEFAULT_MAP_VIEWPORT,
  type MapHandle,
} from "../lib/map-handle";

type LeafletMapPaneProps = {
  workspace: MapWorkspaceState;
  onReady: (handle: MapHandle) => void;
};

export function LeafletMapPane({ workspace, onReady }: LeafletMapPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);

  useEffect(() => {
    let disposed = false;
    const container = containerRef.current;
    if (!container) {
      return;
    }

    async function initMap() {
      const L = await import("leaflet");
      if (disposed || !containerRef.current) {
        return;
      }

      const latitude = workspace.mapCenterLat ?? DEFAULT_MAP_VIEWPORT.latitude;
      const longitude = workspace.mapCenterLng ?? DEFAULT_MAP_VIEWPORT.longitude;
      const zoom = workspace.mapZoom ?? DEFAULT_MAP_VIEWPORT.zoom;

      const map = L.map(containerRef.current, {
        center: [latitude, longitude],
        zoom,
        zoomControl: true,
      });

      createBaseLayer(L, workspace.baseMapStyle).addTo(map);
      mapRef.current = map;

      const handle = createMapHandle(map, {
        setSuppressViewportSync: () => undefined,
        emitViewportChange: () => undefined,
      });
      onReady(handle);

      if (workspace.locationQuery.trim()) {
        void handle.panToQuery(workspace.locationQuery.trim());
      }

      const observer = new ResizeObserver(() => map.invalidateSize());
      if (containerRef.current) {
        observer.observe(containerRef.current);
      }
      return () => observer.disconnect();
    }

    const cleanupPromise = initMap();

    return () => {
      disposed = true;
      void cleanupPromise.then((cleanup) => cleanup?.());
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [
    onReady,
    workspace.baseMapStyle,
    workspace.locationQuery,
    workspace.mapCenterLat,
    workspace.mapCenterLng,
    workspace.mapZoom,
  ]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
