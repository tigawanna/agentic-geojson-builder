import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { LineGuide } from "@repo/isomorphic/nearest-line-point";
import { findNearestPointOnGuides } from "@repo/isomorphic/nearest-line-point";
import type { ReferenceGeoJsonCollection } from "@repo/isomorphic/reference-geojson";
import { buildReferenceInspectTooltipContent } from "@renderer/features/maps/lib/reference-inspect-tooltip";
import type { ControlPointRecord } from "@shared/control-points.types";
import type { GeoSegmentRecord } from "@shared/geo-segments.types";
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
import { lineStringToLatLngs, segmentGroupColor } from "@renderer/features/maps/lib/segment-utils";

type PendingMapPoint = {
  latitude: number;
  longitude: number;
};

type PendingTracePoint = PendingMapPoint;

type LeafletMapPaneProps = {
  workspace: MapWorkspaceState;
  localTileUrl?: string | null;
  tileCacheOverlay?: TileCacheBounds | null;
  referenceOverlay?: ReferenceGeoJsonCollection | null;
  showReferenceOverlay?: boolean;
  showReferenceInspectTooltip?: boolean;
  controlPoints?: ControlPointRecord[];
  geoSegments?: GeoSegmentRecord[];
  pendingMapPoint?: PendingMapPoint | null;
  pendingTracePoints?: PendingTracePoint[];
  canPickMapPoint?: boolean;
  canPickTracePoint?: boolean;
  editingSegmentId?: number | null;
  selectedControlPointId?: number | null;
  onReady: (handle: MapHandle) => void;
  onInitialViewportReady?: (viewport: MapViewport) => void;
  onViewportChange: (viewport: MapViewport) => void;
  onCursorMove: (coordinates: { latitude: number; longitude: number } | null) => void;
  onCoordinateSelect: (viewport: MapViewport) => void;
  onMapLocationPick?: (latitude: number, longitude: number) => void;
  onTracePointAdd?: (latitude: number, longitude: number) => void;
  onPendingTracePointMove?: (index: number, latitude: number, longitude: number) => void;
  onControlPointMapMove?: (controlPointId: number, latitude: number, longitude: number) => void;
  onControlPointClick?: (controlPointId: number) => void;
  onSegmentClick?: (segmentId: number) => void;
  selectedSegmentId?: number | null;
};

export function LeafletMapPane({
  workspace,
  localTileUrl,
  tileCacheOverlay,
  referenceOverlay = null,
  showReferenceOverlay = true,
  showReferenceInspectTooltip = true,
  controlPoints = [],
  geoSegments = [],
  pendingMapPoint = null,
  pendingTracePoints = [],
  canPickMapPoint = false,
  canPickTracePoint = false,
  editingSegmentId = null,
  selectedControlPointId = null,
  onReady,
  onInitialViewportReady,
  onViewportChange,
  onCursorMove,
  onCoordinateSelect,
  onMapLocationPick,
  onTracePointAdd,
  onPendingTracePointMove,
  onControlPointMapMove,
  onControlPointClick,
  onSegmentClick,
  selectedSegmentId = null,
}: LeafletMapPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const baseLayerRef = useRef<import("leaflet").Layer | null>(null);
  const overlayRef = useRef<import("leaflet").Rectangle | null>(null);
  const referenceLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const segmentsLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const markersLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const suppressViewportSyncRef = useRef(false);
  const onReadyRef = useRef(onReady);
  const onInitialViewportReadyRef = useRef(onInitialViewportReady);
  const onViewportChangeRef = useRef(onViewportChange);
  const onCursorMoveRef = useRef(onCursorMove);
  const onCoordinateSelectRef = useRef(onCoordinateSelect);
  const onMapLocationPickRef = useRef(onMapLocationPick);
  const onTracePointAddRef = useRef(onTracePointAdd);
  const onPendingTracePointMoveRef = useRef(onPendingTracePointMove);
  const onControlPointMapMoveRef = useRef(onControlPointMapMove);
  const onControlPointClickRef = useRef(onControlPointClick);
  const onSegmentClickRef = useRef(onSegmentClick);
  const geocodedRef = useRef(false);
  const initialViewportCapturedRef = useRef(false);
  const mapClickTimerRef = useRef<number | undefined>(undefined);
  const referenceGuidesRef = useRef<LineGuide[]>([]);
  const inspectTooltipRef = useRef<import("leaflet").Tooltip | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const REFERENCE_INSPECT_MAX_DISTANCE_METERS = 100;
  const pickModifierHeld = usePickModifierHeld();

  onReadyRef.current = onReady;
  onInitialViewportReadyRef.current = onInitialViewportReady;
  onViewportChangeRef.current = onViewportChange;
  onCursorMoveRef.current = onCursorMove;
  onCoordinateSelectRef.current = onCoordinateSelect;
  onMapLocationPickRef.current = onMapLocationPick;
  onTracePointAddRef.current = onTracePointAdd;
  onPendingTracePointMoveRef.current = onPendingTracePointMove;
  onControlPointMapMoveRef.current = onControlPointMapMove;
  onControlPointClickRef.current = onControlPointClick;
  onSegmentClickRef.current = onSegmentClick;

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
      segmentsLayerRef.current = L.layerGroup().addTo(map);
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
      segmentsLayerRef.current = null;
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
      const segmentsLayer = segmentsLayerRef.current;
      const markersLayer = markersLayerRef.current;

      if (referenceLayer) {
        map.removeLayer(referenceLayer);
      }
      if (segmentsLayer) {
        map.removeLayer(segmentsLayer);
      }
      if (markersLayer) {
        map.removeLayer(markersLayer);
      }

      baseLayerRef.current?.remove();
      baseLayerRef.current = createBaseLayer(L, workspace.baseMapStyle, localTileUrl).addTo(map);

      if (referenceLayer) {
        referenceLayer.addTo(map);
      }
      if (segmentsLayer) {
        segmentsLayer.addTo(map);
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
        }).addTo(referenceLayer);
      });
    })();
  }, [mapReady, referenceOverlay, showReferenceOverlay]);

  useEffect(() => {
    if (!showReferenceOverlay || !referenceOverlay) {
      referenceGuidesRef.current = [];
      return;
    }

    referenceGuidesRef.current = referenceOverlay.features
      .filter((feature) => feature.geometry.coordinates.length >= 2)
      .map((feature, index) => {
        const featureName =
          typeof feature.properties.name === "string" ? feature.properties.name : "Reference line";
        return {
          id: `ref-${index}-${featureName}`,
          name: featureName,
          coordinates: feature.geometry.coordinates,
        };
      });
  }, [referenceOverlay, showReferenceOverlay]);

  useEffect(() => {
    if (!mapReady) {
      return;
    }

    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) {
      return;
    }

    function closeInspectTooltip() {
      if (inspectTooltipRef.current) {
        map.closeTooltip(inspectTooltipRef.current);
        inspectTooltipRef.current = null;
      }
    }

    function handleInspectMove(event: import("leaflet").LeafletMouseEvent) {
      const guides = referenceGuidesRef.current;
      if (!showReferenceOverlay || !showReferenceInspectTooltip || guides.length === 0) {
        closeInspectTooltip();
        return;
      }

      const nearest = findNearestPointOnGuides(
        event.latlng.lat,
        event.latlng.lng,
        guides,
      );

      if (!nearest || nearest.distanceMeters > REFERENCE_INSPECT_MAX_DISTANCE_METERS) {
        closeInspectTooltip();
        return;
      }

      const content = buildReferenceInspectTooltipContent({
        cursorLatitude: event.latlng.lat,
        cursorLongitude: event.latlng.lng,
        nearest,
      });

      if (!inspectTooltipRef.current) {
        inspectTooltipRef.current = L.tooltip({
          sticky: true,
          direction: "top",
          opacity: 0.96,
          className: "reference-inspect-tooltip",
        });
      }

      inspectTooltipRef.current.setLatLng(event.latlng).setContent(content).openOn(map);
    }

    map.on("mousemove", handleInspectMove);
    map.on("mouseout", closeInspectTooltip);

    return () => {
      map.off("mousemove", handleInspectMove);
      map.off("mouseout", closeInspectTooltip);
      closeInspectTooltip();
    };
  }, [mapReady, showReferenceOverlay, showReferenceInspectTooltip, referenceOverlay]);

  useEffect(() => {
    if (!mapReady) {
      return;
    }

    void (async () => {
      const L = await import("leaflet");
      const segmentsLayer = segmentsLayerRef.current;
      if (!segmentsLayer) {
        return;
      }

      segmentsLayer.clearLayers();

      const hideSegmentId =
        editingSegmentId !== null && pendingTracePoints.length >= 2 ? editingSegmentId : null;

      geoSegments
        .filter((segment) => segment.id !== hideSegmentId)
        .forEach((segment) => {
          const coordinates = segment.geometry?.coordinates;
          if (!coordinates || coordinates.length < 2) {
            return;
          }

          const isSelected = segment.id === selectedSegmentId;
          const polyline = L.polyline(lineStringToLatLngs(coordinates), {
            color: isSelected ? "#2563eb" : segmentGroupColor(segment.segmentGroupId),
            weight: isSelected ? 9 : 7,
            opacity: 1,
            lineCap: "round",
            lineJoin: "round",
          })
            .bindTooltip(segment.name ?? `${segment.segmentGroupId} #${segment.segmentIndex + 1}`)
            .addTo(segmentsLayer);

          polyline.on("click", (event) => {
            L.DomEvent.stopPropagation(event);
            onSegmentClickRef.current?.(segment.id);
          });

          polyline.bringToFront();
        });

      const map = mapRef.current;
      if (map?.hasLayer(segmentsLayer)) {
        segmentsLayer.remove();
        segmentsLayer.addTo(map);
      }

      if (pendingTracePoints.length >= 2) {
        L.polyline(
          pendingTracePoints.map((point) => ({ lat: point.latitude, lng: point.longitude })),
          {
            color: "#f59e0b",
            weight: 4,
            opacity: 0.95,
            dashArray: "8 6",
          },
        ).addTo(segmentsLayer);
      }
    })();
  }, [editingSegmentId, geoSegments, mapReady, pendingTracePoints, selectedSegmentId]);

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
      const displayLabel = point.poleNumber ?? String(index + 1);
      const marker = L.marker([point.latitude, point.longitude], {
        draggable: true,
        icon: L.divIcon({
          className: "",
          html: `<div style="margin-left:-12px;margin-top:-12px;width:24px;height:24px;border-radius:9999px;border:2px solid white;background:${fillColor};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:white;cursor:grab;">${displayLabel}</div>`,
          iconSize: [24, 24],
        }),
      }).addTo(markersLayer);

      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        onControlPointMapMoveRef.current?.(point.id, lat, lng);
      });

      marker.on("click", (event) => {
        L.DomEvent.stopPropagation(event);
        onControlPointClickRef.current?.(point.id);
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

    pendingTracePoints.forEach((point, index) => {
      const marker = L.marker([point.latitude, point.longitude], {
        draggable: true,
        icon: L.divIcon({
          className: "",
          html: `<div style="margin-left:-7px;margin-top:-7px;width:14px;height:14px;border-radius:9999px;border:2px solid white;background:#f59e0b;cursor:grab;"></div>`,
          iconSize: [14, 14],
        }),
      }).addTo(markersLayer);

      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        onPendingTracePointMoveRef.current?.(index, lat, lng);
      });
    });
  }, [controlPoints, mapReady, pendingMapPoint, pendingTracePoints, selectedControlPointId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    function handleClick(event: import("leaflet").LeafletMouseEvent) {
      const domEvent = event.originalEvent;
      if (!isPickModifierEvent(domEvent)) {
        return;
      }

      domEvent.preventDefault();

      if (mapClickTimerRef.current !== undefined) {
        window.clearTimeout(mapClickTimerRef.current);
      }

      mapClickTimerRef.current = window.setTimeout(() => {
        if (canPickTracePoint) {
          onTracePointAddRef.current?.(event.latlng.lat, event.latlng.lng);
          return;
        }

        if (canPickMapPoint) {
          onMapLocationPickRef.current?.(event.latlng.lat, event.latlng.lng);
        }
      }, 250);
    }

    map.on("click", handleClick);
    const activePickMode = (canPickMapPoint || canPickTracePoint) && pickModifierHeld;
    if (containerRef.current) {
      containerRef.current.style.cursor = activePickMode ? "crosshair" : "";
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
  }, [canPickMapPoint, canPickTracePoint, pickModifierHeld]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="absolute inset-0" />
      {canPickMapPoint ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] rounded-box bg-base-100/90 px-2 py-1 text-xs text-base-content/70">
          Ctrl+click to set map pin
        </div>
      ) : null}
      {canPickTracePoint ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] rounded-box bg-base-100/90 px-2 py-1 text-xs text-base-content/70">
          Ctrl+click to add trail point
        </div>
      ) : null}
    </div>
  );
}
