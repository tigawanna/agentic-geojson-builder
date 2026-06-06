import { useCallback, useEffect, useRef, useState } from "react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { asRegisterableHotkey } from "@renderer/shortcuts/as-hotkey";
import mapboxgl, { type MapboxGeoJSONFeature } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { LineGuide } from "@repo/isomorphic/nearest-line-point";
import { findNearestPointOnGuides } from "@repo/isomorphic/nearest-line-point";
import type { MapMarkerSaveDraft } from "@renderer/features/maps/lib/map-marker-save-draft";
import {
  REFERENCE_INSPECT_MAX_DISTANCE_METERS,
  type ReferenceInspectHover,
} from "@renderer/features/maps/lib/reference-inspect-tooltip";
import { buildTrailElevationGuides } from "@renderer/features/maps/lib/build-trail-elevation-guides";
import { enableMapboxTerrain } from "@renderer/features/maps/lib/mapbox-terrain";
import {
  resolveInspectElevation,
  resolveInspectElevationMeters,
  toNearbyElevationPointsFromControlPoints,
  toNearbyElevationPointsFromMapPoints,
} from "@renderer/features/maps/lib/resolve-inspect-elevation";
import { setReferenceInspectCopyTarget } from "@renderer/features/maps/lib/reference-inspect-copy-registry";
import { referenceGeoJsonColor } from "@renderer/features/maps/lib/reference-geojson-color";
import { DEFAULT_MAP_VIEWPORT } from "@renderer/features/maps/lib/map-handle";
import { createMapboxMapHandle } from "@renderer/features/maps/lib/create-mapbox-map-handle";
import {
  MAPBOX_GL_STYLES,
  resolveMapboxGlStyleId,
  type MapboxGlStyleId,
} from "@renderer/features/maps/lib/mapbox-gl-styles";
import { buildMapMarkerDraftFromProbe } from "@renderer/features/maps/lib/map-marker-save-draft";
import type { MapboxFeatureProbe } from "@renderer/features/maps/lib/mapbox-probe.types";
import { MapInspectCombinedHoverTooltip } from "@renderer/features/maps/components/MapInspectCombinedHoverTooltip";
import { MapboxInspectPanel } from "@renderer/features/maps/components/MapboxInspectPanel";
import { ReferenceInspectTooltipBody } from "@renderer/features/maps/components/ReferenceInspectTooltipBody";
import { MapboxTokenRequiredModal } from "@renderer/features/maps/components/MapboxTokenRequiredModal";
import { isPickModifierEvent } from "@renderer/features/maps/lib/pick-modifier";
import { useMapboxTokenQuery } from "@renderer/features/maps/hooks/useMapboxToken";
import { useMapboxTokenInvalid } from "@renderer/features/maps/hooks/useMapboxTokenInvalid";
import { attachMapboxUnauthorizedListener } from "@renderer/features/maps/lib/attach-mapbox-unauthorized-listener";
import { segmentGroupColor } from "@renderer/features/maps/lib/segment-utils";
import type { LeafletMapPaneProps } from "@renderer/features/maps/components/LeafletMapPane";
import {
  resolveMapPointMarkerHalo,
  resolveMapPointMarkerRing,
} from "@renderer/features/maps/lib/map-point-marker-appearance";

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

const REFERENCE_SOURCE_ID = "workspace-reference-lines";
const REFERENCE_LAYER_ID = "workspace-reference-lines-layer";
const SEGMENT_SOURCE_ID = "workspace-geo-segments";
const SEGMENT_LAYER_ID = "workspace-geo-segments-layer";
const TRACE_SOURCE_ID = "workspace-pending-trace";
const TRACE_LAYER_ID = "workspace-pending-trace-layer";
const CACHE_BOUNDS_SOURCE_ID = "workspace-cache-bounds";
const CACHE_BOUNDS_FILL_ID = "workspace-cache-bounds-fill";
const CACHE_BOUNDS_LINE_ID = "workspace-cache-bounds-line";

type ReferenceInspectPointer = {
  hover: ReferenceInspectHover;
  clientX: number;
  clientY: number;
};

export type MapboxGlWorkspacePaneProps = LeafletMapPaneProps & {
  inspectMode?: boolean;
  capturePending?: boolean;
  onCapture?: (draft: MapMarkerSaveDraft) => void;
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
  linkMode = false,
  linkFromPointId = null,
  linkChainPointIds = [],
  linkSuggestionPointIds = [],
  pathSegmentLinks = [],
  pendingMapPoint = null,
  pendingTracePoints = [],
  canPickMapPoint = false,
  canPickTracePoint = false,
  canPlaceMapPoint = false,
  canCaptureMapPoint = false,
  controlPointDragEnabled = false,
  mapPointDragEnabled = false,
  editingSegmentId = null,
  selectedControlPointId = null,
  selectedSegmentId = null,
  highlightedPathGroupId = null,
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
  onMapPointMapMove,
  onControlPointClick,
  onSegmentClick,
  onCapture,
  showNeighborCoverage = false,
  markerIdsWithNeighborLinks = [],
}: MapboxGlWorkspacePaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const suppressViewportSyncRef = useRef(false);
  const geocodedRef = useRef(false);
  const initialViewportCapturedRef = useRef(false);
  const mapClickTimerRef = useRef<number | undefined>(undefined);
  const referenceGuidesRef = useRef<LineGuide[]>([]);
  const trailElevationGuidesRef = useRef<LineGuide[]>([]);
  const referenceInspectHoverRef = useRef<ReferenceInspectHover | null>(null);
  const syncSourcesRef = useRef<() => void>(() => {});
  const syncMarkersRef = useRef<() => void>(() => {});
  const [mapReady, setMapReady] = useState(false);
  const [hoverProbe, setHoverProbe] = useState<MapboxFeatureProbe | null>(null);
  const [pinnedProbe, setPinnedProbe] = useState<MapboxFeatureProbe | null>(null);
  const [pinnedReferenceHover, setPinnedReferenceHover] = useState<ReferenceInspectHover | null>(
    null,
  );
  const [referenceInspect, setReferenceInspect] = useState<ReferenceInspectPointer | null>(null);

  const token = useMapboxTokenQuery().data ?? null;
  const tokenInvalid = useMapboxTokenInvalid();
  const styleId = resolveMapboxGlStyleId(workspace.mapboxGlStyle, workspace.baseMapStyle);
  const styleIdRef = useRef(styleId);
  const appliedStyleIdRef = useRef<MapboxGlStyleId | null>(null);
  styleIdRef.current = styleId;

  const dismissPinnedInspect = useCallback(() => {
    setPinnedProbe(null);
    setPinnedReferenceHover(null);
  }, []);

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
  const onMapPointMapMoveRef = useRef(onMapPointMapMove);
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
  onMapPointMapMoveRef.current = onMapPointMapMove;
  onControlPointClickRef.current = onControlPointClick;
  onSegmentClickRef.current = onSegmentClick;
  onCaptureRef.current = onCapture;

  const buildCaptureDraftFromProbe = useCallback(
    (probe: MapboxFeatureProbe, referenceHover: ReferenceInspectHover | null) =>
      buildMapMarkerDraftFromProbe(probe, styleIdRef.current, {
        referenceHover,
        trailGuides: trailElevationGuidesRef.current,
      }),
    [],
  );

  const emitCapture = useCallback(
    (probe: MapboxFeatureProbe, referenceHover: ReferenceInspectHover | null) => {
      dismissPinnedInspect();
      onCaptureRef.current?.(buildCaptureDraftFromProbe(probe, referenceHover));
    },
    [buildCaptureDraftFromProbe, dismissPinnedInspect],
  );
  const emitCaptureRef = useRef(emitCapture);
  emitCaptureRef.current = emitCapture;

  const captureFromPinnedProbe = useCallback(() => {
    if (!pinnedProbe) {
      return;
    }
    emitCapture(pinnedProbe, pinnedReferenceHover);
  }, [emitCapture, pinnedProbe, pinnedReferenceHover]);

  useHotkey(asRegisterableHotkey("Escape"), dismissPinnedInspect, {
    enabled: inspectMode && pinnedProbe !== null,
  });

  useHotkey(asRegisterableHotkey("Mod+Enter"), captureFromPinnedProbe, {
    enabled: inspectMode && pinnedProbe !== null && !capturePending,
  });

  const dataRef = useRef({
    referenceOverlay,
    showReferenceOverlay,
    showReferenceInspectTooltip,
    geoSegments,
    selectedSegmentId,
    highlightedPathGroupId,
    editingSegmentId,
    pendingTracePoints,
    tileCacheOverlay,
    controlPoints,
    controlPointDragEnabled,
    mapPoints,
    selectedMapPointId,
    linkMode,
    linkFromPointId,
    linkChainPointIds,
    linkSuggestionPointIds,
    pathSegmentLinks,
    selectedControlPointId,
    pendingMapPoint,
    canPickMapPoint,
    canPickTracePoint,
    canPlaceMapPoint,
    canCaptureMapPoint,
    inspectMode,
    pinnedProbe,
  });
  dataRef.current = {
    referenceOverlay,
    showReferenceOverlay,
    showReferenceInspectTooltip,
    geoSegments,
    selectedSegmentId,
    highlightedPathGroupId,
    editingSegmentId,
    pendingTracePoints,
    tileCacheOverlay,
    controlPoints,
    controlPointDragEnabled,
    mapPoints,
    selectedMapPointId,
    linkMode,
    linkFromPointId,
    linkChainPointIds,
    linkSuggestionPointIds,
    pathSegmentLinks,
    selectedControlPointId,
    pendingMapPoint,
    canPickMapPoint,
    canPickTracePoint,
    canPlaceMapPoint,
    canCaptureMapPoint,
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
    trailElevationGuidesRef.current = buildTrailElevationGuides({
      geoSegments,
      referenceOverlay: showReferenceOverlay ? referenceOverlay : null,
    });
  }, [geoSegments, referenceOverlay, showReferenceOverlay]);

  useEffect(() => {
    return () => {
      if (mapClickTimerRef.current !== undefined) {
        window.clearTimeout(mapClickTimerRef.current);
      }
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
      appliedStyleIdRef.current = null;
      syncSourcesRef.current = () => {};
      syncMarkersRef.current = () => {};
      geocodedRef.current = false;
      initialViewportCapturedRef.current = false;
      setMapReady(false);
    };
  }, [workspace.id]);

  function handleMapboxUnauthorized() {
    mapRef.current?.remove();
    mapRef.current = null;
    appliedStyleIdRef.current = null;
    setMapReady(false);
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !token || tokenInvalid) {
      return;
    }

    if (mapRef.current) {
      const map = mapRef.current;
      const detachAuth = attachMapboxUnauthorizedListener(map, handleMapboxUnauthorized);
      map.resize();
      onReadyRef.current(
        createMapboxMapHandle(map, {
          setSuppressViewportSync: (value) => {
            suppressViewportSyncRef.current = value;
          },
          emitViewportChange: () => {
            if (suppressViewportSyncRef.current) {
              return;
            }
            const center = map.getCenter();
            onViewportChangeRef.current({
              latitude: center.lat,
              longitude: center.lng,
              zoom: map.getZoom(),
            });
          },
        }),
      );
      syncSourcesRef.current();
      syncMarkersRef.current();
      return () => {
        detachAuth();
      };
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
    appliedStyleIdRef.current = styleIdRef.current;
    const detachAuth = attachMapboxUnauthorizedListener(map, handleMapboxUnauthorized);

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
      enableMapboxTerrain(map);
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
      const segmentFeatures = data.geoSegments
        .filter((segment) => segment.id !== hideSegmentId)
        .filter((segment) => (segment.geometry?.coordinates?.length ?? 0) >= 2)
        .map((segment) => ({
          type: "Feature" as const,
          geometry: segment.geometry,
          properties: {
            id: segment.id,
            color:
              segment.id === data.selectedSegmentId ||
              segment.segmentGroupId === data.highlightedPathGroupId
                ? "#2563eb"
                : segmentGroupColor(segment.segmentGroupId),
            width:
              segment.id === data.selectedSegmentId ||
              segment.segmentGroupId === data.highlightedPathGroupId
                ? 9
                : 7,
          },
        }));

      const pathLinkFeatures = data.pathSegmentLinks
        .filter((link) => (link.geometry?.coordinates?.length ?? 0) >= 2)
        .map((link) => ({
          type: "Feature" as const,
          geometry: link.geometry!,
          properties: {
            id: -link.id,
            color: "#16a34a",
            width: 6,
          },
        }));

      const segmentCollection: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [...segmentFeatures, ...pathLinkFeatures],
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

      const chainCoordinates =
        data.linkMode && data.linkChainPointIds.length >= 2
          ? data.linkChainPointIds
              .map((pointId) => data.mapPoints.find((point) => point.id === pointId))
              .filter((point): point is NonNullable<typeof point> => point !== undefined)
              .map((point) => [point.longitude, point.latitude] as [number, number])
          : [];

      const traceCollection: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [
          ...(data.pendingTracePoints.length >= 2
            ? [
                {
                  type: "Feature" as const,
                  geometry: {
                    type: "LineString" as const,
                    coordinates: data.pendingTracePoints.map((point) => [
                      point.longitude,
                      point.latitude,
                    ]),
                  },
                  properties: {},
                },
              ]
            : []),
          ...(chainCoordinates.length >= 2
            ? [
                {
                  type: "Feature" as const,
                  geometry: {
                    type: "LineString" as const,
                    coordinates: chainCoordinates,
                  },
                  properties: {},
                },
              ]
            : []),
        ],
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

    function resolveElevationForEvent(
      event: mapboxgl.MapMouseEvent,
      referenceHover: ReferenceInspectHover | null,
      features: MapboxGeoJSONFeature[],
    ) {
      const data = dataRef.current;
      return resolveInspectElevation({
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng,
        referenceHover,
        trailGuides: trailElevationGuidesRef.current,
        terrainElevationMeters: readElevationMeters(event.lngLat),
        controlPoints: toNearbyElevationPointsFromControlPoints(data.controlPoints),
        mapPoints: toNearbyElevationPointsFromMapPoints(data.mapPoints),
        features,
      });
    }

    function buildProbe(
      event: mapboxgl.MapMouseEvent,
      referenceHover: ReferenceInspectHover | null,
    ): MapboxFeatureProbe {
      const features = map.queryRenderedFeatures(event.point);
      const resolved = resolveElevationForEvent(event, referenceHover, features);

      return {
        features,
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng,
        elevationMeters: resolved?.elevationMeters ?? null,
        elevationSource: resolved?.source ?? null,
        clientX: event.originalEvent.clientX,
        clientY: event.originalEvent.clientY,
      };
    }

    function handleReferenceInspect(event: mapboxgl.MapMouseEvent) {
      const data = dataRef.current;
      const guides = referenceGuidesRef.current;
      if (!data.showReferenceOverlay || !data.showReferenceInspectTooltip || guides.length === 0) {
        referenceInspectHoverRef.current = null;
        setReferenceInspect(null);
        setReferenceInspectCopyTarget(null);
        return;
      }
      const nearest = findNearestPointOnGuides(event.lngLat.lat, event.lngLat.lng, guides);
      if (!nearest || nearest.distanceMeters > REFERENCE_INSPECT_MAX_DISTANCE_METERS) {
        referenceInspectHoverRef.current = null;
        setReferenceInspect(null);
        setReferenceInspectCopyTarget(null);
        return;
      }
      const hover = {
        cursorLatitude: event.lngLat.lat,
        cursorLongitude: event.lngLat.lng,
        nearest,
      };
      referenceInspectHoverRef.current = hover;
      setReferenceInspectCopyTarget({
        latitude: hover.nearest.latitude,
        longitude: hover.nearest.longitude,
        elevationMeters: resolveInspectElevationMeters({
          latitude: hover.nearest.latitude,
          longitude: hover.nearest.longitude,
          referenceHover: hover,
          trailGuides: trailElevationGuidesRef.current,
          terrainElevationMeters: readElevationMeters(event.lngLat),
          controlPoints: toNearbyElevationPointsFromControlPoints(data.controlPoints),
          mapPoints: toNearbyElevationPointsFromMapPoints(data.mapPoints),
        }),
      });
      setReferenceInspect({
        hover,
        clientX: event.originalEvent.clientX,
        clientY: event.originalEvent.clientY,
      });
    }

    map.on("mousemove", (event) => {
      onCursorMoveRef.current({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });

      const data = dataRef.current;
      if (!isPickMode(data) && data.showReferenceInspectTooltip) {
        handleReferenceInspect(event);
      } else {
        referenceInspectHoverRef.current = null;
        setReferenceInspect(null);
        setReferenceInspectCopyTarget(null);
      }

      if (data.inspectMode || data.canCaptureMapPoint) {
        map.getCanvas().style.cursor = "crosshair";
        if (data.inspectMode) {
          const probe = buildProbe(event, referenceInspectHoverRef.current);
          setHoverProbe(probe);
        }
      }
    });

    map.on("mouseout", () => {
      onCursorMoveRef.current(null);
      referenceInspectHoverRef.current = null;
      setReferenceInspect(null);
      setReferenceInspectCopyTarget(null);
      map.getCanvas().style.cursor = isPickMode(dataRef.current) ? "crosshair" : "";
      if (dataRef.current.inspectMode) {
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
            const probe = buildProbe(event, referenceInspectHoverRef.current);
            emitCaptureRef.current(probe, referenceInspectHoverRef.current);
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

      if (data.canCaptureMapPoint && !modifier) {
        const probe = buildProbe(event, referenceInspectHoverRef.current);
        emitCaptureRef.current(probe, referenceInspectHoverRef.current);
        return;
      }

      if (data.inspectMode) {
        const probe = buildProbe(event, referenceInspectHoverRef.current);
        if (modifier) {
          emitCaptureRef.current(probe, referenceInspectHoverRef.current);
          return;
        }
        setPinnedProbe(probe);
        setPinnedReferenceHover(referenceInspectHoverRef.current);
      }
    });

    map.on("click", SEGMENT_LAYER_ID, (event) => {
      const data = dataRef.current;
      if (isPickMode(data) || data.inspectMode || data.canCaptureMapPoint) {
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
      detachAuth();
      observer.disconnect();
    };
  }, [workspace.id, token, tokenInvalid]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || appliedStyleIdRef.current === styleId) {
      return;
    }

    const nextStyle = MAPBOX_GL_STYLES[styleId];

    function handleStyleReady() {
      if (!mapRef.current || styleIdRef.current !== styleId) {
        return;
      }
      appliedStyleIdRef.current = styleId;
      syncSourcesRef.current();
      syncMarkersRef.current();
    }

    function applyStyle() {
      if (!mapRef.current || appliedStyleIdRef.current === styleId) {
        return;
      }
      mapRef.current.setStyle(nextStyle);
    }

    map.once("style.load", handleStyleReady);

    if (map.isStyleLoaded()) {
      applyStyle();
    } else {
      map.once("load", applyStyle);
    }

    return () => {
      map.off("style.load", handleStyleReady);
      map.off("load", applyStyle);
    };
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
    highlightedPathGroupId,
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

      const chainSet = new Set(linkChainPointIds);
      const chainIndexById = new Map(
        linkChainPointIds.map((pointId, index) => [pointId, index + 1]),
      );
      const suggestionSet = new Set(linkSuggestionPointIds);
      const neighborLinkSet = new Set(markerIdsWithNeighborLinks);
      const pinSize = linkMode ? 26 : 18;

      mapPoints.forEach((point) => {
        const selected = point.id === selectedMapPointId;
        const inChain = chainSet.has(point.id);
        const chainIndex = chainIndexById.get(point.id);
        const isLinkHead = point.id === linkFromPointId;
        const isSuggestion = suggestionSet.has(point.id);
        const color = mapPointColor(point.category);
        const appearanceInput = {
          pointId: point.id,
          selected,
          linkMode,
          inChain,
          isLinkHead,
          isSuggestion,
          showNeighborCoverage,
          markerIdsWithNeighborLinks: neighborLinkSet,
        };
        const ring = resolveMapPointMarkerRing(appearanceInput);
        const baseLabel = point.ref ?? point.name ?? "";
        const label =
          chainIndex !== undefined && baseLabel ? `${chainIndex}:${baseLabel}` : baseLabel;
        const element = document.createElement("div");
        const markerCursor = mapPointDragEnabled ? "grab" : "pointer";
        const halo = resolveMapPointMarkerHalo(ring, appearanceInput);
        element.style.cssText = `display:flex;align-items:center;gap:4px;cursor:${markerCursor};`;
        element.innerHTML = `<div style="width:${pinSize}px;height:${pinSize}px;transform:rotate(45deg);border:2px solid ${ring};background:${color};${halo}"></div>${label ? `<span style="transform:translateY(-1px);font-size:${linkMode ? 11 : 10}px;font-weight:700;color:#0f172a;background:rgba(255,255,255,0.9);border-radius:4px;padding:0 4px;white-space:nowrap;">${label}</span>` : ""}`;
        const marker = new mapboxgl.Marker({
          element,
          anchor: "center",
          draggable: mapPointDragEnabled,
        })
          .setLngLat([point.longitude, point.latitude])
          .addTo(map);
        if (mapPointDragEnabled) {
          marker.on("dragend", () => {
            const lngLat = marker.getLngLat();
            onMapPointMapMoveRef.current?.(point.id, lngLat.lat, lngLat.lng);
          });
        }
        element.addEventListener("click", (clickEvent) => {
          clickEvent.stopPropagation();
          onMapPointClickRef.current?.(point.id, {
            ctrlKey: clickEvent.ctrlKey,
            metaKey: clickEvent.metaKey,
          });
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
    mapPointDragEnabled,
    mapPoints,
    selectedMapPointId,
    linkChainPointIds,
    linkFromPointId,
    linkMode,
    linkSuggestionPointIds,
    selectedControlPointId,
    pendingMapPoint,
    pendingTracePoints,
    showNeighborCoverage,
    markerIdsWithNeighborLinks,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    if (!inspectMode) {
      map.getCanvas().style.cursor = isPickMode(dataRef.current) ? "crosshair" : "";
      setHoverProbe(null);
      dismissPinnedInspect();
    }
  }, [dismissPinnedInspect, inspectMode]);

  if (!token || tokenInvalid) {
    return (
      <div className="absolute inset-0 bg-base-200">
        <MapboxTokenRequiredModal reason={tokenInvalid ? "invalid" : "missing"} />
      </div>
    );
  }

  const referenceHover = referenceInspect?.hover ?? null;

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
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
      {canCaptureMapPoint ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-1000 rounded-box bg-base-100/90 px-2 py-1 text-xs text-base-content/70">
          Click the map to place a new marker
        </div>
      ) : null}
      {linkMode ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-1000 max-w-xs rounded-box bg-info/90 px-2 py-1 text-xs text-info-content">
          Ctrl+click markers to add to segment chain. Drag list items to reorder.
        </div>
      ) : null}
      {!inspectMode && referenceInspect ? (
        <div
          className="pointer-events-none fixed z-50 max-w-[18rem] rounded-lg border border-base-300 bg-base-100/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm"
          style={{ left: referenceInspect.clientX + 14, top: referenceInspect.clientY + 14 }}
        >
          <ReferenceInspectTooltipBody hover={referenceInspect.hover} />
        </div>
      ) : null}
      {inspectMode && hoverProbe ? (
        <MapInspectCombinedHoverTooltip
          coordinates={{
            latitude: hoverProbe.latitude,
            longitude: hoverProbe.longitude,
            elevationMeters: hoverProbe.elevationMeters,
          }}
          features={hoverProbe.features}
          referenceHover={referenceHover}
          clientX={hoverProbe.clientX}
          clientY={hoverProbe.clientY}
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
          referenceHover={pinnedReferenceHover}
          pinned
          capturePending={capturePending}
          onClose={dismissPinnedInspect}
          onCapture={captureFromPinnedProbe}
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

function isPickMode(flags: PickModeFlags & { canCaptureMapPoint?: boolean }): boolean {
  return (
    flags.canPickMapPoint ||
    flags.canPickTracePoint ||
    flags.canPlaceMapPoint ||
    Boolean(flags.canCaptureMapPoint)
  );
}

function upsertGeoJsonSource(map: mapboxgl.Map, sourceId: string, data: GeoJSON.FeatureCollection) {
  const existing = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
  if (existing) {
    existing.setData(data);
    return;
  }
  map.addSource(sourceId, { type: "geojson", data });
}
