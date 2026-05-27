import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { MapWorkspaceState } from "@shared/maps.types";
import type { TileCacheBounds } from "@shared/tile-cache.types";
import {
  createBaseLayer,
  createMapHandle,
  DEFAULT_MAP_VIEWPORT,
  type MapHandle,
  type MapViewport,
} from "../lib/map-handle";

type LeafletMapPaneProps = {
  workspace: MapWorkspaceState;
  localTileUrl?: string | null;
  tileCacheOverlay?: TileCacheBounds | null;
  onReady: (handle: MapHandle) => void;
  onInitialViewportReady?: (viewport: MapViewport) => void;
  onViewportChange: (viewport: MapViewport) => void;
  onCursorMove: (coordinates: { latitude: number; longitude: number } | null) => void;
  onCoordinateSelect: (viewport: MapViewport) => void;
};

export function LeafletMapPane({
  workspace,
  localTileUrl,
  tileCacheOverlay,
  onReady,
  onInitialViewportReady,
  onViewportChange,
  onCursorMove,
  onCoordinateSelect,
}: LeafletMapPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const baseLayerRef = useRef<import("leaflet").TileLayer | null>(null);
  const overlayRef = useRef<import("leaflet").Rectangle | null>(null);
  const suppressViewportSyncRef = useRef(false);
  const onReadyRef = useRef(onReady);
  const onInitialViewportReadyRef = useRef(onInitialViewportReady);
  const onViewportChangeRef = useRef(onViewportChange);
  const onCursorMoveRef = useRef(onCursorMove);
  const onCoordinateSelectRef = useRef(onCoordinateSelect);
  const geocodedRef = useRef(false);
  const initialViewportCapturedRef = useRef(false);

  onReadyRef.current = onReady;
  onInitialViewportReadyRef.current = onInitialViewportReady;
  onViewportChangeRef.current = onViewportChange;
  onCursorMoveRef.current = onCursorMove;
  onCoordinateSelectRef.current = onCoordinateSelect;

  useEffect(() => {
    let disposed = false;
    const container = containerRef.current;
    if (!container) {
      return;
    }

    async function initMap() {
      const L = await import("leaflet");
      if (disposed || !containerRef.current || mapRef.current) {
        return;
      }

      const latitude = workspace.mapCenterLat ?? DEFAULT_MAP_VIEWPORT.latitude;
      const longitude = workspace.mapCenterLng ?? DEFAULT_MAP_VIEWPORT.longitude;
      const zoom = workspace.mapZoom ?? DEFAULT_MAP_VIEWPORT.zoom;

      const map = L.map(containerRef.current, {
        center: [latitude, longitude],
        zoom,
        zoomControl: true,
        doubleClickZoom: false,
      });

      baseLayerRef.current = createBaseLayer(L, workspace.baseMapStyle, localTileUrl).addTo(map);
      mapRef.current = map;

      function emitViewportChange() {
        if (suppressViewportSyncRef.current) {
          return;
        }

        const center = map.getCenter();
        onViewportChangeRef.current({
          latitude: center.lat,
          longitude: center.lng,
          zoom: map.getZoom(),
        });
      }

      const handle = createMapHandle(map, {
        setSuppressViewportSync: (value) => {
          suppressViewportSyncRef.current = value;
        },
        emitViewportChange,
      });
      onReadyRef.current(handle);

      function captureInitialViewport() {
        if (initialViewportCapturedRef.current) {
          return;
        }

        initialViewportCapturedRef.current = true;
        const center = map.getCenter();
        onInitialViewportReadyRef.current?.({
          latitude: center.lat,
          longitude: center.lng,
          zoom: map.getZoom(),
        });
      }

      map.on("moveend", emitViewportChange);
      map.on("zoomend", emitViewportChange);
      map.on("mousemove", (event) => {
        onCursorMoveRef.current({
          latitude: event.latlng.lat,
          longitude: event.latlng.lng,
        });
      });
      map.on("mouseout", () => {
        onCursorMoveRef.current(null);
      });
      map.on("dblclick", (event) => {
        onCoordinateSelectRef.current({
          latitude: event.latlng.lat,
          longitude: event.latlng.lng,
          zoom: map.getZoom(),
        });
      });

      if (workspace.locationQuery.trim() && !geocodedRef.current) {
        geocodedRef.current = true;
        void handle.panToQuery(workspace.locationQuery.trim()).finally(() => {
          captureInitialViewport();
        });
      } else {
        captureInitialViewport();
      }

      const observer = new ResizeObserver(() => map.invalidateSize());
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }

    const cleanupPromise = initMap();
    return () => {
      disposed = true;
      void cleanupPromise.then((cleanup) => cleanup?.());
      mapRef.current?.remove();
      mapRef.current = null;
      baseLayerRef.current = null;
      overlayRef.current = null;
      geocodedRef.current = false;
      initialViewportCapturedRef.current = false;
    };
  }, [workspace.id]);

  useEffect(() => {
    async function swapBaseLayer() {
      const map = mapRef.current;
      if (!map) {
        return;
      }

      const L = await import("leaflet");
      baseLayerRef.current?.remove();
      baseLayerRef.current = createBaseLayer(L, workspace.baseMapStyle, localTileUrl).addTo(map);
    }

    void swapBaseLayer();
  }, [localTileUrl, workspace.baseMapStyle]);

  useEffect(() => {
    async function updateOverlay() {
      const map = mapRef.current;
      if (!map) {
        return;
      }

      const L = await import("leaflet");
      overlayRef.current?.remove();

      if (!tileCacheOverlay) {
        return;
      }

      overlayRef.current = L.rectangle(
        [
          [tileCacheOverlay.south, tileCacheOverlay.west],
          [tileCacheOverlay.north, tileCacheOverlay.east],
        ],
        {
          color: "#2563eb",
          weight: 2,
          fillOpacity: 0.06,
          dashArray: "6 4",
        },
      ).addTo(map);
    }

    void updateOverlay();
  }, [tileCacheOverlay]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
