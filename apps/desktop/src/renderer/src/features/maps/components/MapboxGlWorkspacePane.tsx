import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { LineGuide } from "@repo/isomorphic/nearest-line-point";
import { findNearestPointOnGuides } from "@repo/isomorphic/nearest-line-point";
import type { CreateMapboxGroundCaptureInput } from "@shared/mapbox-capture.types";
import { buildReferenceInspectTooltipContent } from "@renderer/features/maps/lib/reference-inspect-tooltip";
import { referenceGeoJsonColor } from "@renderer/features/maps/lib/reference-geojson-color";
import { DEFAULT_MAP_VIEWPORT } from "@renderer/features/maps/lib/map-handle";
import { createMapboxMapHandle } from "@renderer/features/maps/lib/create-mapbox-map-handle";
import {
  MAPBOX_GL_STYLES,
  resolveMapboxGlStyleId,
} from "@renderer/features/maps/lib/mapbox-gl-styles";
import { buildCaptureFromProbe } from "@renderer/features/maps/lib/build-capture-from-probe";
import type { MapboxFeatureProbe } from "@renderer/features/maps/lib/mapbox-probe.types";
import { MapboxFeatureHoverTooltip } from "@renderer/features/maps/components/MapboxFeatureHoverTooltip";
import { MapboxInspectPanel } from "@renderer/features/maps/components/MapboxInspectPanel";
import { isPickModifierEvent } from "@renderer/features/maps/lib/pick-modifier";
import { useMapboxTokenQuery } from "@renderer/features/maps/hooks/useMapboxToken";
import { segmentGroupColor } from "@renderer/features/maps/lib/segment-utils";
import type { LeafletMapPaneProps } from "@renderer/features/maps/components/LeafletMapPane";

const MAP_POINT_CATEGORY_COLORS: Record<string, string> = {
  junction: "#7c3aed",
  gate: "#dc2626",
  viewpoint: "#0891b2",
  water: "#2563eb",
  cave: "#78350f",
  rest_area: "#ca8a04",
  sign: "#475569",
  custom: "#db2777",
};

function mapPointColor(category: string): string {
  return MAP_POINT_CATEGORY_COLORS[category] ?? "#db2777";
}

const REFERENCE_INSPECT_MAX_DISTANCE_METERS = 100;

const REFERENCE_SOURCE_ID = "workspace-reference-lines";
const REFERENCE_LAYER_ID = "workspace-reference-lines-layer";
const SEGMENT_SOURCE_ID = "workspace-geo-segments";
const SEGMENT_LAYER_ID = "workspace-geo-segments-layer";
const TRACE_SOURCE_ID = "workspace-pending-trace";
const TRACE_LAYER_ID = "workspace-pending-trace-layer";
const CACHE_BOUNDS_SOURCE_ID = "workspace-cache-bounds";
const CACHE_BOUNDS_FILL_ID = "workspace-cache-bounds-fill";
const CACHE_BOUNDS_LINE_ID = "workspace-cache-bounds-line";

type ReferenceInspectState = {
  html: string;
  x: number;
  y: number;
};

export type MapboxGlWorkspacePaneProps = LeafletMapPaneProps & {
  inspectMode?: boolean;
  capturePending?: boolean;
  onCapture?: (input: CreateMapboxGroundCaptureInput) => void;
};

export function MapboxGlWorkspacePane({
  workspace,
  tileCacheOverlay = null,
  referenceOverlay = null,
  showReferenceOverlay = true,
  showReferenceInspectTooltip = true,
  controlPoints = [],
  geoSegments = [],
  mapPoints = [],
  selectedMapPointId = null,
  linkFromPointId = null,
  pendingMapPoint = null,
  pendingTracePoints = [],
  canPickMapPoint = false,
  canPickTracePoint = false,
  canPlaceMapPoint = false,
  controlPointDragEnabled = false,
  editingSegmentId = null,
  selectedControlPointId = null,
  selectedSegmentId = null,
  inspectMode = false,
  capturePending = false,
  onReady,
  onInitialViewportReady,
  onViewportChange,
  onCursorMove,
  onCoordinateSelect,
  onMapLocationPick,
  onTracePointAdd,
  onMapPointPlace,
  onMapPointClick,
  onPendingTracePointMove,
  onControlPointMapMove,
  onControlPointClick,
  onSegmentClick,
  onCapture,
}: MapboxGlWorkspacePaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const suppressViewportSyncRef = useRef(false);
  const geocodedRef = useRef(false);
  const initialViewportCapturedRef = useRef(false);
  const mapClickTimerRef = useRef<number | undefined>(undefined);
  const referenceGuidesRef = useRef<LineGuide[]>([]);
  const syncSourcesRef = useRef<() => void>(() => {});
  const syncMarkersRef = useRef<() => void>(() => {});
  const [mapReady, setMapReady] = useState(false);
  const [hoverProbe, setHoverProbe] = useState<MapboxFeatureProbe | null>(null);
  const [pinnedProbe, setPinnedProbe] = useState<MapboxFeatureProbe | null>(null);
  const [referenceInspect, setReferenceInspect] = useState<ReferenceInspectState | null>(null);

  const token = useMapboxTokenQuery().data ?? null;
  const styleId = resolveMapboxGlStyleId(workspace.mapboxGlStyle, workspace.baseMapStyle);
  const styleIdRef = useRef(styleId);
  styleIdRef.current = styleId;

  const onReadyRef = useRef(onReady);
  const onInitialViewportReadyRef = useRef(onInitialViewportReady);
  const onViewportChangeRef = useRef(onViewportChange);
  const onCursorMoveRef = useRef(onCursorMove);
  const onCoordinateSelectRef = useRef(onCoordinateSelect);
  const onMapLocationPickRef = useRef(onMapLocationPick);
  const onTracePointAddRef = useRef(onTracePointAdd);
  const onMapPointPlaceRef = useRef(onMapPointPlace);
  const onMapPointClickRef = useRef(onMapPointClick);
  const onPendingTracePointMoveRef = useRef(onPendingTracePointMove);
  const onControlPointMapMoveRef = useRef(onControlPointMapMove);
  const onControlPointClickRef = useRef(onControlPointClick);
  const onSegmentClickRef = useRef(onSegmentClick);
  const onCaptureRef = useRef(onCapture);

  onReadyRef.current = onReady;
  onInitialViewportReadyRef.current = onInitialViewportReady;
  onViewportChangeRef.current = onViewportChange;
  onCursorMoveRef.current = onCursorMove;
  onCoordinateSelectRef.current = onCoordinateSelect;
  onMapLocationPickRef.current = onMapLocationPick;
  onTracePointAddRef.current = onTracePointAdd;
  onMapPointPlaceRef.current = onMapPointPlace;
  onMapPointClickRef.current = onMapPointClick;
  onPendingTracePointMoveRef.current = onPendingTracePointMove;
  onControlPointMapMoveRef.current = onControlPointMapMove;
  onControlPointClickRef.current = onControlPointClick;
  onSegmentClickRef.current = onSegmentClick;
  onCaptureRef.current = onCapture;

  const dataRef = useRef({
    referenceOverlay,
    showReferenceOverlay,
    showReferenceInspectTooltip,
    geoSegments,
    selectedSegmentId,
    editingSegmentId,
    pendingTracePoints,
    tileCacheOverlay,
    controlPoints,
    controlPointDragEnabled,
    mapPoints,
    selectedMapPointId,
    linkFromPointId,
    selectedControlPointId,
    pendingMapPoint,
    canPickMapPoint,
    canPickTracePoint,
    canPlaceMapPoint,
    inspectMode,
    pinnedProbe,
  });
  dataRef.current = {
    referenceOverlay,
    showReferenceOverlay,
    showReferenceInspectTooltip,
    geoSegments,
    selectedSegmentId,
    editingSegmentId,
    pendingTracePoints,
    tileCacheOverlay,
    controlPoints,
    controlPointDragEnabled,
    mapPoints,
    selectedMapPointId,
    linkFromPointId,
    selectedControlPointId,
    pendingMapPoint,
    canPickMapPoint,
    canPickTracePoint,
    canPlaceMapPoint,
    inspectMode,
    pinnedProbe,
  };

  useEffect(() => {
    referenceGuidesRef.current =
      showReferenceOverlay && referenceOverlay
        ? referenceOverlay.features
            .filter((feature) => feature.geometry.coordinates.length >= 2)
            .map((feature, index) => {
              const featureName =
                typeof feature.properties.name === "string"
                  ? feature.properties.name
                  : "Reference line";
              return {
                id: `ref-${index}-${featureName}`,
                name: featureName,
                coordinates: feature.geometry.coordinates,
              };
            })
        : [];
  }, [referenceOverlay, showReferenceOverlay]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !token) {
      return;
    }

    mapboxgl.accessToken = token;
    const latitude = workspace.mapCenterLat ?? DEFAULT_MAP_VIEWPORT.latitude;
    const longitude = workspace.mapCenterLng ?? DEFAULT_MAP_VIEWPORT.longitude;
    const zoom = workspace.mapZoom ?? DEFAULT_MAP_VIEWPORT.zoom;

    const map = new mapboxgl.Map({
      container,
      style: MAPBOX_GL_STYLES[styleIdRef.current],
      center: [longitude, latitude],
      zoom,
      attributionControl: true,
      preserveDrawingBuffer: true,
      doubleClickZoom: false,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
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

    const handle = createMapboxMapHandle(map, {
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

    function syncSources() {
      if (!map.isStyleLoaded()) {
        return;
      }
      const data = dataRef.current;

      const referenceCollection: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features:
          data.showReferenceOverlay && data.referenceOverlay
            ? data.referenceOverlay.features.map((feature) => {
                const featureName =
                  typeof feature.properties.name === "string"
                    ? feature.properties.name
                    : "Reference line";
                const layerName =
                  typeof feature.properties.referenceLayerName === "string"
                    ? feature.properties.referenceLayerName
                    : "Reference layer";
                return {
                  type: "Feature" as const,
                  geometry: feature.geometry,
                  properties: { color: referenceGeoJsonColor(`${layerName}:${featureName}`) },
                };
              })
            : [],
      };
      upsertGeoJsonSource(map, REFERENCE_SOURCE_ID, referenceCollection);
      if (!map.getLayer(REFERENCE_LAYER_ID)) {
        map.addLayer({
          id: REFERENCE_LAYER_ID,
          type: "line",
          source: REFERENCE_SOURCE_ID,
          paint: {
            "line-color": ["get", "color"],
            "line-width": 5,
            "line-opacity": 0.95,
            "line-dasharray": [2, 1.2],
          },
        });
      }

      const hideSegmentId =
        data.editingSegmentId !== null && data.pendingTracePoints.length >= 2
          ? data.editingSegmentId
          : null;
      const segmentCollection: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: data.geoSegments
          .filter((segment) => segment.id !== hideSegmentId)
          .filter((segment) => (segment.geometry?.coordinates?.length ?? 0) >= 2)
          .map((segment) => ({
            type: "Feature" as const,
            geometry: segment.geometry,
            properties: {
              id: segment.id,
              color:
                segment.id === data.selectedSegmentId
                  ? "#2563eb"
                  : segmentGroupColor(segment.segmentGroupId),
              width: segment.id === data.selectedSegmentId ? 9 : 7,
            },
          })),
      };
      upsertGeoJsonSource(map, SEGMENT_SOURCE_ID, segmentCollection);
      if (!map.getLayer(SEGMENT_LAYER_ID)) {
        map.addLayer({
          id: SEGMENT_LAYER_ID,
          type: "line",
          source: SEGMENT_SOURCE_ID,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": ["get", "color"], "line-width": ["get", "width"] },
        });
      }

      const traceCollection: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features:
          data.pendingTracePoints.length >= 2
            ? [
                {
                  type: "Feature",
                  geometry: {
                    type: "LineString",
                    coordinates: data.pendingTracePoints.map((point) => [
                      point.longitude,
                      point.latitude,
                    ]),
                  },
                  properties: {},
                },
              ]
            : [],
      };
      upsertGeoJsonSource(map, TRACE_SOURCE_ID, traceCollection);
      if (!map.getLayer(TRACE_LAYER_ID)) {
        map.addLayer({
          id: TRACE_LAYER_ID,
          type: "line",
          source: TRACE_SOURCE_ID,
          paint: {
            "line-color": "#f59e0b",
            "line-width": 4,
            "line-opacity": 0.95,
            "line-dasharray": [2, 1.5],
          },
        });
      }

      const cacheBounds = data.tileCacheOverlay;
      const cacheCollection: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: cacheBounds
          ? [
              {
                type: "Feature",
                geometry: {
                  type: "Polygon",
                  coordinates: [
                    [
                      [cacheBounds.west, cacheBounds.south],
                      [cacheBounds.east, cacheBounds.south],
                      [cacheBounds.east, cacheBounds.north],
                      [cacheBounds.west, cacheBounds.north],
                      [cacheBounds.west, cacheBounds.south],
                    ],
                  ],
                },
                properties: {},
              },
            ]
          : [],
      };
      upsertGeoJsonSource(map, CACHE_BOUNDS_SOURCE_ID, cacheCollection);
      if (!map.getLayer(CACHE_BOUNDS_FILL_ID)) {
        map.addLayer({
          id: CACHE_BOUNDS_FILL_ID,
          type: "fill",
          source: CACHE_BOUNDS_SOURCE_ID,
          paint: { "fill-color": "#2563eb", "fill-opacity": 0.06 },
        });
      }
      if (!map.getLayer(CACHE_BOUNDS_LINE_ID)) {
        map.addLayer({
          id: CACHE_BOUNDS_LINE_ID,
          type: "line",
          source: CACHE_BOUNDS_SOURCE_ID,
          paint: { "line-color": "#2563eb", "line-width": 2, "line-dasharray": [3, 2] },
        });
      }
    }

    syncSourcesRef.current = syncSources;

    function onStyleReady() {
      syncSources();
    }

    map.on("style.load", onStyleReady);
    if (map.isStyleLoaded()) {
      onStyleReady();
    }

    map.on("load", () => {
      setMapReady(true);
      syncSources();
      syncMarkersRef.current();
    });

    map.on("moveend", emitViewportChange);
    map.on("zoomend", emitViewportChange);

    map.on("dblclick", (event) => {
      onCoordinateSelectRef.current({
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng,
        zoom: map.getZoom(),
      });
    });

    function readElevationMeters(lngLat: mapboxgl.LngLat): number | null {
      if (!map.isStyleLoaded()) {
        return null;
      }
      try {
        const elevation = map.queryTerrainElevation(lngLat, { exaggerated: false });
        return typeof elevation === "number" && Number.isFinite(elevation) ? elevation : null;
      } catch {
        return null;
      }
    }

    function buildProbe(event: mapboxgl.MapMouseEvent): MapboxFeatureProbe {
      return {
        features: map.queryRenderedFeatures(event.point),
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng,
        elevationMeters: readElevationMeters(event.lngLat),
        clientX: event.originalEvent.clientX,
        clientY: event.originalEvent.clientY,
      };
    }

    function handleReferenceInspect(event: mapboxgl.MapMouseEvent) {
      const data = dataRef.current;
      const guides = referenceGuidesRef.current;
      if (!data.showReferenceOverlay || !data.showReferenceInspectTooltip || guides.length === 0) {
        setReferenceInspect(null);
        return;
      }
      const nearest = findNearestPointOnGuides(event.lngLat.lat, event.lngLat.lng, guides);
      if (!nearest || nearest.distanceMeters > REFERENCE_INSPECT_MAX_DISTANCE_METERS) {
        setReferenceInspect(null);
        return;
      }
      setReferenceInspect({
        html: buildReferenceInspectTooltipContent({
          cursorLatitude: event.lngLat.lat,
          cursorLongitude: event.lngLat.lng,
          nearest,
        }),
        x: event.originalEvent.clientX,
        y: event.originalEvent.clientY,
      });
    }

    map.on("mousemove", (event) => {
      onCursorMoveRef.current({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });

      const data = dataRef.current;
      if (data.inspectMode && !data.pinnedProbe) {
        map.getCanvas().style.cursor = "crosshair";
        setHoverProbe(buildProbe(event));
      } else if (!isPickMode(data)) {
        handleReferenceInspect(event);
      }
    });

    map.on("mouseout", () => {
      onCursorMoveRef.current(null);
      setReferenceInspect(null);
      if (!dataRef.current.pinnedProbe) {
        map.getCanvas().style.cursor = isPickMode(dataRef.current) ? "crosshair" : "";
        setHoverProbe(null);
      }
    });

    map.on("click", (event) => {
      const data = dataRef.current;
      const modifier = isPickModifierEvent(event.originalEvent);
      const pickActive = isPickMode(data);

      if (modifier && pickActive) {
        event.preventDefault();
        if (mapClickTimerRef.current !== undefined) {
          window.clearTimeout(mapClickTimerRef.current);
        }
        const lat = event.lngLat.lat;
        const lng = event.lngLat.lng;
        mapClickTimerRef.current = window.setTimeout(() => {
          const current = dataRef.current;
          if (current.canPlaceMapPoint) {
            onMapPointPlaceRef.current?.(lat, lng);
            return;
          }
          if (current.canPickTracePoint) {
            onTracePointAddRef.current?.(lat, lng);
            return;
          }
          if (current.canPickMapPoint) {
            onMapLocationPickRef.current?.(lat, lng);
          }
        }, 250);
        return;
      }

      if (data.inspectMode) {
        const probe = buildProbe(event);
        if (modifier) {
          onCaptureRef.current?.(buildCaptureFromProbe(probe, styleIdRef.current));
          return;
        }
        setPinnedProbe(probe);
        setHoverProbe(null);
      }
    });

    map.on("click", SEGMENT_LAYER_ID, (event) => {
      const data = dataRef.current;
      if (isPickMode(data) || data.inspectMode) {
        return;
      }
      const feature = event.features?.[0];
      const segmentId = feature?.properties?.id;
      if (typeof segmentId === "number") {
        onSegmentClickRef.current?.(segmentId);
      }
    });

    map.on("mouseenter", SEGMENT_LAYER_ID, () => {
      if (!isPickMode(dataRef.current)) {
        map.getCanvas().style.cursor = "pointer";
      }
    });
    map.on("mouseleave", SEGMENT_LAYER_ID, () => {
      map.getCanvas().style.cursor = isPickMode(dataRef.current) ? "crosshair" : "";
    });

    if (workspace.locationQuery.trim() && !geocodedRef.current) {
      geocodedRef.current = true;
      void handle.panToQuery(workspace.locationQuery.trim()).finally(() => {
        captureInitialViewport();
      });
    } else {
      captureInitialViewport();
    }

    const observer = new ResizeObserver(() => {
      map.resize();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      if (mapClickTimerRef.current !== undefined) {
        window.clearTimeout(mapClickTimerRef.current);
      }
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      syncSourcesRef.current = () => {};
      syncMarkersRef.current = () => {};
      geocodedRef.current = false;
      initialViewportCapturedRef.current = false;
      setMapReady(false);
    };
  }, [workspace.id, token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    map.setStyle(MAPBOX_GL_STYLES[styleId]);
  }, [styleId]);

  useEffect(() => {
    if (!mapReady) {
      return;
    }
    syncSourcesRef.current();
  }, [
    mapReady,
    referenceOverlay,
    showReferenceOverlay,
    geoSegments,
    selectedSegmentId,
    editingSegmentId,
    pendingTracePoints,
    tileCacheOverlay,
  ]);

  useEffect(() => {
    function syncMarkers() {
      const map = mapRef.current;
      if (!map) {
        return;
      }
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      controlPoints.forEach((point, index) => {
        const selected = point.id === selectedControlPointId;
        const fillColor = selected ? "#2563eb" : "#16a34a";
        const displayLabel = point.poleNumber ?? String(index + 1);
        const element = document.createElement("div");
        element.style.cssText = `width:24px;height:24px;border-radius:9999px;border:2px solid white;background:${fillColor};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:white;cursor:${controlPointDragEnabled ? "grab" : "pointer"};`;
        element.textContent = displayLabel;
        const marker = new mapboxgl.Marker({ element, draggable: controlPointDragEnabled })
          .setLngLat([point.longitude, point.latitude])
          .addTo(map);
        if (controlPointDragEnabled) {
          marker.on("dragend", () => {
            const lngLat = marker.getLngLat();
            onControlPointMapMoveRef.current?.(point.id, lngLat.lat, lngLat.lng);
          });
        }
        element.addEventListener("click", (clickEvent) => {
          clickEvent.stopPropagation();
          onControlPointClickRef.current?.(point.id);
        });
        markersRef.current.push(marker);
      });

      mapPoints.forEach((point) => {
        const selected = point.id === selectedMapPointId;
        const isLinkSource = point.id === linkFromPointId;
        const color = mapPointColor(point.category);
        const ring = isLinkSource ? "#f59e0b" : selected ? "#2563eb" : "#ffffff";
        const label = point.ref ?? point.name ?? "";
        const element = document.createElement("div");
        element.style.cssText = "display:flex;align-items:center;gap:4px;cursor:pointer;";
        element.innerHTML = `<div style="width:18px;height:18px;transform:rotate(45deg);border:2px solid ${ring};background:${color};box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>${label ? `<span style="transform:translateY(-1px);font-size:10px;font-weight:700;color:#0f172a;background:rgba(255,255,255,0.85);border-radius:4px;padding:0 3px;white-space:nowrap;">${label}</span>` : ""}`;
        const marker = new mapboxgl.Marker({ element, anchor: "center" })
          .setLngLat([point.longitude, point.latitude])
          .addTo(map);
        element.addEventListener("click", (clickEvent) => {
          clickEvent.stopPropagation();
          onMapPointClickRef.current?.(point.id);
        });
        markersRef.current.push(marker);
      });

      if (pendingMapPoint) {
        const element = document.createElement("div");
        element.style.cssText =
          "width:18px;height:18px;border-radius:9999px;border:2px solid white;background:#f59e0b;box-shadow:0 1px 3px rgba(0,0,0,0.4);";
        markersRef.current.push(
          new mapboxgl.Marker({ element, anchor: "center" })
            .setLngLat([pendingMapPoint.longitude, pendingMapPoint.latitude])
            .addTo(map),
        );
      }

      pendingTracePoints.forEach((point, index) => {
        const element = document.createElement("div");
        element.style.cssText =
          "width:14px;height:14px;border-radius:9999px;border:2px solid white;background:#f59e0b;cursor:grab;";
        const marker = new mapboxgl.Marker({ element, draggable: true, anchor: "center" })
          .setLngLat([point.longitude, point.latitude])
          .addTo(map);
        marker.on("dragend", () => {
          const lngLat = marker.getLngLat();
          onPendingTracePointMoveRef.current?.(index, lngLat.lat, lngLat.lng);
        });
        markersRef.current.push(marker);
      });
    }

    syncMarkersRef.current = syncMarkers;
    syncMarkers();
  }, [
    controlPoints,
    controlPointDragEnabled,
    mapPoints,
    selectedMapPointId,
    linkFromPointId,
    selectedControlPointId,
    pendingMapPoint,
    pendingTracePoints,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    if (!inspectMode) {
      map.getCanvas().style.cursor = isPickMode(dataRef.current) ? "crosshair" : "";
      setHoverProbe(null);
      setPinnedProbe(null);
    }
  }, [inspectMode]);

  if (!token) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-base-200 px-6 text-center text-sm text-base-content/60">
        Add a Mapbox access token in settings to use the Mapbox GL renderer.
      </div>
    );
  }

  const activeProbe = pinnedProbe ?? hoverProbe;

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="absolute inset-0" />
      {canPickMapPoint ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-1000 rounded-box bg-base-100/90 px-2 py-1 text-xs text-base-content/70">
          Ctrl+click to set map pin
        </div>
      ) : null}
      {canPickTracePoint ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-1000 rounded-box bg-base-100/90 px-2 py-1 text-xs text-base-content/70">
          Ctrl+click to add trail point
        </div>
      ) : null}
      {canPlaceMapPoint ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-1000 rounded-box bg-base-100/90 px-2 py-1 text-xs text-base-content/70">
          Ctrl+click to drop a marker
        </div>
      ) : null}
      {referenceInspect ? (
        <div
          className="pointer-events-none fixed z-50 max-w-[18rem] rounded-lg border border-base-300 bg-base-100/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm"
          style={{ left: referenceInspect.x + 14, top: referenceInspect.y + 14 }}
          dangerouslySetInnerHTML={{ __html: referenceInspect.html }}
        />
      ) : null}
      {inspectMode && activeProbe && !pinnedProbe ? (
        <MapboxFeatureHoverTooltip
          coordinates={{
            latitude: activeProbe.latitude,
            longitude: activeProbe.longitude,
            elevationMeters: activeProbe.elevationMeters,
          }}
          features={activeProbe.features}
          clientX={activeProbe.clientX}
          clientY={activeProbe.clientY}
        />
      ) : null}
      {inspectMode && pinnedProbe ? (
        <MapboxInspectPanel
          coordinates={{
            latitude: pinnedProbe.latitude,
            longitude: pinnedProbe.longitude,
            elevationMeters: pinnedProbe.elevationMeters,
          }}
          features={pinnedProbe.features}
          pinned
          capturePending={capturePending}
          onClose={() => setPinnedProbe(null)}
          onCapture={() => onCaptureRef.current?.(buildCaptureFromProbe(pinnedProbe, styleId))}
        />
      ) : null}
    </div>
  );
}

type PickModeFlags = {
  canPickMapPoint: boolean;
  canPickTracePoint: boolean;
  canPlaceMapPoint: boolean;
};

function isPickMode(flags: PickModeFlags): boolean {
  return flags.canPickMapPoint || flags.canPickTracePoint || flags.canPlaceMapPoint;
}

function upsertGeoJsonSource(map: mapboxgl.Map, sourceId: string, data: GeoJSON.FeatureCollection) {
  const existing = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
  if (existing) {
    existing.setData(data);
    return;
  }
  map.addSource(sourceId, { type: "geojson", data });
}
