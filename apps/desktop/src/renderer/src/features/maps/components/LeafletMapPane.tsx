import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { ReferenceGeoJsonCollection } from "@repo/isomorphic/reference-geojson";
import type { ControlPointRecord } from "@shared/control-points.types";
import type { MapWorkspaceState } from "@shared/maps.types";
import type { TileCacheBounds } from "@shared/tile-cache.types";
import { referenceGeoJsonColor } from "@renderer/features/maps/lib/reference-geojson-color";
import {
  createBaseLayer,
  createMapHandle,
  DEFAULT_MAP_VIEWPORT,
  type MapHandle,
  type MapViewport,
} from "@renderer/features/maps/lib/map-handle";
import {
  isPickModifierEvent,
  usePickModifierHeld,
} from "@renderer/features/maps/lib/pick-modifier";

type PendingMapPoint = {
  latitude: number;
  longitude: number;
};

function lineStringToLatLngs(coordinates: [number, number][]) {
  return coordinates.map(([longitude, latitude]) => ({ lat: latitude, lng: longitude }));
}

type LeafletMapPaneProps = {
  workspace: MapWorkspaceState;
  localTileUrl?: string | null;
  tileCacheOverlay?: TileCacheBounds | null;
  referenceOverlay?: ReferenceGeoJsonCollection | null;
  showReferenceOverlay?: boolean;
  controlPoints?: ControlPointRecord[];
  pendingMapPoint?: PendingMapPoint | null;
  canPickMapPoint?: boolean;
  selectedControlPointId?: number | null;
  onReady: (handle: MapHandle) => void;
  onInitialViewportReady?: (viewport: MapViewport) => void;
  onViewportChange: (viewport: MapViewport) => void;
  onCursorMove: (coordinates: { latitude: number; longitude: number } | null) => void;
  onCoordinateSelect: (viewport: MapViewport) => void;
  onMapLocationPick?: (latitude: number, longitude: number) => void;
  onControlPointMapMove?: (controlPointId: number, latitude: number, longitude: number) => void;
};

export function LeafletMapPane({
  workspace,
  localTileUrl,
  tileCacheOverlay,
  referenceOverlay = null,
  showReferenceOverlay = true,
  controlPoints = [],
  pendingMapPoint = null,
  canPickMapPoint = false,
  selectedControlPointId = null,
  onReady,
  onInitialViewportReady,
  onViewportChange,
  onCursorMove,
  onCoordinateSelect,
  onMapLocationPick,
  onControlPointMapMove,
}: LeafletMapPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const baseLayerRef = useRef<import("leaflet").Layer | null>(null);
  const overlayRef = useRef<import("leaflet").Rectangle | null>(null);
  const referenceLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const markersLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const suppressViewportSyncRef = useRef(false);
  const onReadyRef = useRef(onReady);
  const onInitialViewportReadyRef = useRef(onInitialViewportReady);
  const onViewportChangeRef = useRef(onViewportChange);
  const onCursorMoveRef = useRef(onCursorMove);
  const onCoordinateSelectRef = useRef(onCoordinateSelect);
  const onMapLocationPickRef = useRef(onMapLocationPick);
  const onControlPointMapMoveRef = useRef(onControlPointMapMove);
  const geocodedRef = useRef(false);
  const initialViewportCapturedRef = useRef(false);
  const mapClickTimerRef = useRef<number | undefined>(undefined);
  const [mapReady, setMapReady] = useState(false);
  const pickModifierHeld = usePickModifierHeld();

  onReadyRef.current = onReady;
  onInitialViewportReadyRef.current = onInitialViewportReady;
  onViewportChangeRef.current = onViewportChange;
  onCursorMoveRef.current = onCursorMove;
  onCoordinateSelectRef.current = onCoordinateSelect;
  onMapLocationPickRef.current = onMapLocationPick;
  onControlPointMapMoveRef.current = onControlPointMapMove;

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

      leafletRef.current = L;

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
      referenceLayerRef.current = L.layerGroup().addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setMapReady(true);

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
      referenceLayerRef.current = null;
      markersLayerRef.current = null;
      geocodedRef.current = false;
      initialViewportCapturedRef.current = false;
      setMapReady(false);
    };
  }, [workspace.id]);

  useEffect(() => {
    async function swapBaseLayer() {
      const map = mapRef.current;
      if (!map) {
        return;
      }

      const L = await import("leaflet");
      const referenceLayer = referenceLayerRef.current;
      const markersLayer = markersLayerRef.current;

      if (referenceLayer) {
        map.removeLayer(referenceLayer);
      }
      if (markersLayer) {
        map.removeLayer(markersLayer);
      }

      baseLayerRef.current?.remove();
      baseLayerRef.current = createBaseLayer(L, workspace.baseMapStyle, localTileUrl).addTo(map);

      if (referenceLayer) {
        referenceLayer.addTo(map);
      }
      if (markersLayer) {
        markersLayer.addTo(map);
      }
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

  useEffect(() => {
    if (!mapReady) {
      return;
    }

    void (async () => {
      const L = await import("leaflet");
      const referenceLayer = referenceLayerRef.current;
      if (!referenceLayer) {
        return;
      }

      referenceLayer.clearLayers();

      if (!showReferenceOverlay || !referenceOverlay) {
        return;
      }

      referenceOverlay.features.forEach((feature) => {
        const featureName =
          typeof feature.properties.name === "string" ? feature.properties.name : "Reference line";
        const layerName =
          typeof feature.properties.referenceLayerName === "string"
            ? feature.properties.referenceLayerName
            : "Reference layer";

        L.polyline(lineStringToLatLngs(feature.geometry.coordinates), {
          color: referenceGeoJsonColor(`${layerName}:${featureName}`),
          weight: 5,
          opacity: 0.95,
          dashArray: "10 6",
        })
          .bindTooltip(`${featureName} · ${layerName}`, { sticky: true })
          .addTo(referenceLayer);
      });
    })();
  }, [mapReady, referenceOverlay, showReferenceOverlay]);

  useEffect(() => {
    if (!mapReady) {
      return;
    }

    const map = mapRef.current;
    const L = leafletRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !L || !markersLayer) {
      return;
    }

    markersLayer.clearLayers();

    controlPoints.forEach((point, index) => {
      const selected = point.id === selectedControlPointId;
      const fillColor = selected ? "#2563eb" : "#16a34a";
      const marker = L.marker([point.latitude, point.longitude], {
        draggable: true,
        icon: L.divIcon({
          className: "",
          html: `<div style="margin-left:-12px;margin-top:-12px;width:24px;height:24px;border-radius:9999px;border:2px solid white;background:${fillColor};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:white;cursor:grab;">${index + 1}</div>`,
          iconSize: [24, 24],
        }),
      }).addTo(markersLayer);

      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        onControlPointMapMoveRef.current?.(point.id, lat, lng);
      });
    });

    if (pendingMapPoint) {
      L.circleMarker([pendingMapPoint.latitude, pendingMapPoint.longitude], {
        radius: 9,
        color: "#ffffff",
        weight: 2,
        fillColor: "#f59e0b",
        fillOpacity: 1,
      }).addTo(markersLayer);
    }
  }, [controlPoints, mapReady, pendingMapPoint, selectedControlPointId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    function handleClick(event: import("leaflet").LeafletMouseEvent) {
      const domEvent = event.originalEvent;
      if (!isPickModifierEvent(domEvent) || !canPickMapPoint) {
        return;
      }

      domEvent.preventDefault();

      if (mapClickTimerRef.current !== undefined) {
        window.clearTimeout(mapClickTimerRef.current);
      }

      mapClickTimerRef.current = window.setTimeout(() => {
        onMapLocationPickRef.current?.(event.latlng.lat, event.latlng.lng);
      }, 250);
    }

    map.on("click", handleClick);
    if (containerRef.current) {
      containerRef.current.style.cursor = canPickMapPoint && pickModifierHeld ? "crosshair" : "";
    }

    return () => {
      map.off("click", handleClick);
      if (mapClickTimerRef.current !== undefined) {
        window.clearTimeout(mapClickTimerRef.current);
      }
      if (containerRef.current) {
        containerRef.current.style.cursor = "";
      }
    };
  }, [canPickMapPoint, pickModifierHeld]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="absolute inset-0" />
      {canPickMapPoint ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] rounded-box bg-base-100/90 px-2 py-1 text-xs text-base-content/70">
          Ctrl+click to set map pin
        </div>
      ) : null}
    </div>
  );
}
