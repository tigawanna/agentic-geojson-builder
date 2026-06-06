import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { LineGuide } from "@repo/isomorphic/nearest-line-point";
import { findNearestPointOnGuides } from "@repo/isomorphic/nearest-line-point";
import type { ReferenceGeoJsonCollection } from "@repo/isomorphic/reference-geojson";
import {
  buildReferenceInspectCopyTarget,
  buildReferenceInspectTooltipContent,
  REFERENCE_INSPECT_MAX_DISTANCE_METERS,
} from "@renderer/features/maps/lib/reference-inspect-tooltip";
import { setReferenceInspectCopyTarget } from "@renderer/features/maps/lib/reference-inspect-copy-registry";
import type { ControlPointRecord } from "@shared/control-points.types";
import type { GeoSegmentRecord } from "@shared/geo-segments.types";
import type { MapLinkRecord } from "@shared/map-links.types";
import type { MapPointRecord } from "@shared/map-points.types";
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
import { useMapboxTokenQuery } from "@renderer/features/maps/hooks/useMapboxToken";
import {
  resolveMapPointMarkerHalo,
  resolveMapPointMarkerRing,
} from "@renderer/features/maps/lib/map-point-marker-appearance";
import type { VirtualPreviewEdge } from "@renderer/features/maps/lib/virtual-graph-preview.types";
import { lineStringToLatLngs, segmentGroupColor } from "@renderer/features/maps/lib/segment-utils";
import {
  neighborLinkOverlayColor,
  type NeighborLinkOverlayEdge,
} from "@shared/neighbor-link-overlay";

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

type PendingMapPoint = {
  latitude: number;
  longitude: number;
};

type PendingTracePoint = PendingMapPoint;

export type LeafletMapPaneProps = {
  workspace: MapWorkspaceState;
  localTileUrl?: string | null;
  tileCacheOverlay?: TileCacheBounds | null;
  referenceOverlay?: ReferenceGeoJsonCollection | null;
  showReferenceOverlay?: boolean;
  showReferenceInspectTooltip?: boolean;
  controlPoints?: ControlPointRecord[];
  geoSegments?: GeoSegmentRecord[];
  mapPoints?: MapPointRecord[];
  selectedMapPointId?: number | null;
  linkMode?: boolean;
  linkFromPointId?: number | null;
  linkChainPointIds?: number[];
  linkSuggestionPointIds?: number[];
  linkRouteStartId?: number | null;
  linkRouteEndId?: number | null;
  linkRouteViaIds?: number[];
  pathSegmentLinks?: MapLinkRecord[];
  pendingMapPoint?: PendingMapPoint | null;
  pendingTracePoints?: PendingTracePoint[];
  canPickMapPoint?: boolean;
  canPickTracePoint?: boolean;
  canPlaceMapPoint?: boolean;
  canCaptureMapPoint?: boolean;
  controlPointDragEnabled?: boolean;
  editingSegmentId?: number | null;
  selectedControlPointId?: number | null;
  onReady: (handle: MapHandle) => void;
  onInitialViewportReady?: (viewport: MapViewport) => void;
  onViewportChange: (viewport: MapViewport) => void;
  onCursorMove: (coordinates: { latitude: number; longitude: number } | null) => void;
  onCoordinateSelect: (viewport: MapViewport) => void;
  onMapLocationPick?: (latitude: number, longitude: number) => void;
  onTracePointAdd?: (latitude: number, longitude: number) => void;
  onMapPointPlace?: (latitude: number, longitude: number, elevationMeters?: number | null) => void;
  onMapMarkerCapture?: (latitude: number, longitude: number) => void;
  onMapPointClick?: (pointId: number, modifiers: { ctrlKey: boolean; metaKey: boolean }) => void;
  onPendingTracePointMove?: (index: number, latitude: number, longitude: number) => void;
  onControlPointMapMove?: (controlPointId: number, latitude: number, longitude: number) => void;
  onMapPointMapMove?: (pointId: number, latitude: number, longitude: number) => void;
  onControlPointClick?: (controlPointId: number) => void;
  mapPointDragEnabled?: boolean;
  draggableMapPointId?: number | null;
  onSegmentClick?: (segmentId: number) => void;
  selectedSegmentId?: number | null;
  highlightedPathGroupId?: string | null;
  showNeighborCoverage?: boolean;
  neighborLinkOverlayEdges?: NeighborLinkOverlayEdge[];
  markerIdsWithNeighborLinks?: number[];
  virtualPreviewEdges?: VirtualPreviewEdge[];
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
  mapPoints = [],
  selectedMapPointId = null,
  linkMode = false,
  linkFromPointId = null,
  linkChainPointIds = [],
  linkSuggestionPointIds = [],
  linkRouteStartId = null,
  linkRouteEndId = null,
  linkRouteViaIds = [],
  pathSegmentLinks = [],
  pendingMapPoint = null,
  pendingTracePoints = [],
  canPickMapPoint = false,
  canPickTracePoint = false,
  canPlaceMapPoint = false,
  canCaptureMapPoint = false,
  controlPointDragEnabled = false,
  mapPointDragEnabled = false,
  draggableMapPointId = null,
  editingSegmentId = null,
  selectedControlPointId = null,
  onReady,
  onInitialViewportReady,
  onViewportChange,
  onCursorMove,
  onCoordinateSelect,
  onMapLocationPick,
  onTracePointAdd,
  onMapPointPlace,
  onMapMarkerCapture,
  onMapPointClick,
  onPendingTracePointMove,
  onControlPointMapMove,
  onMapPointMapMove,
  onControlPointClick,
  onSegmentClick,
  selectedSegmentId = null,
  highlightedPathGroupId = null,
  showNeighborCoverage = false,
  neighborLinkOverlayEdges = [],
  markerIdsWithNeighborLinks = [],
  virtualPreviewEdges = [],
}: LeafletMapPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const baseLayerRef = useRef<import("leaflet").Layer | null>(null);
  const overlayRef = useRef<import("leaflet").Rectangle | null>(null);
  const referenceLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const segmentsLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const neighborLinksLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const markersLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const suppressViewportSyncRef = useRef(false);
  const onReadyRef = useRef(onReady);
  const onInitialViewportReadyRef = useRef(onInitialViewportReady);
  const onViewportChangeRef = useRef(onViewportChange);
  const onCursorMoveRef = useRef(onCursorMove);
  const onCoordinateSelectRef = useRef(onCoordinateSelect);
  const onMapLocationPickRef = useRef(onMapLocationPick);
  const onTracePointAddRef = useRef(onTracePointAdd);
  const onMapPointPlaceRef = useRef(onMapPointPlace);
  const onMapMarkerCaptureRef = useRef(onMapMarkerCapture);
  const onMapPointClickRef = useRef(onMapPointClick);
  const onPendingTracePointMoveRef = useRef(onPendingTracePointMove);
  const onControlPointMapMoveRef = useRef(onControlPointMapMove);
  const onMapPointMapMoveRef = useRef(onMapPointMapMove);
  const onControlPointClickRef = useRef(onControlPointClick);
  const onSegmentClickRef = useRef(onSegmentClick);
  const geocodedRef = useRef(false);
  const initialViewportCapturedRef = useRef(false);
  const mapClickTimerRef = useRef<number | undefined>(undefined);
  const referenceGuidesRef = useRef<LineGuide[]>([]);
  const inspectTooltipRef = useRef<import("leaflet").Tooltip | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const pickModifierHeld = usePickModifierHeld();
  const mapboxToken = useMapboxTokenQuery().data ?? null;
  const mapboxTokenRef = useRef(mapboxToken);
  mapboxTokenRef.current = mapboxToken;

  onReadyRef.current = onReady;
  onInitialViewportReadyRef.current = onInitialViewportReady;
  onViewportChangeRef.current = onViewportChange;
  onCursorMoveRef.current = onCursorMove;
  onCoordinateSelectRef.current = onCoordinateSelect;
  onMapLocationPickRef.current = onMapLocationPick;
  onTracePointAddRef.current = onTracePointAdd;
  onMapPointPlaceRef.current = onMapPointPlace;
  onMapMarkerCaptureRef.current = onMapMarkerCapture;
  onMapPointClickRef.current = onMapPointClick;
  onPendingTracePointMoveRef.current = onPendingTracePointMove;
  onControlPointMapMoveRef.current = onControlPointMapMove;
  onMapPointMapMoveRef.current = onMapPointMapMove;
  onControlPointClickRef.current = onControlPointClick;
  onSegmentClickRef.current = onSegmentClick;

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      baseLayerRef.current = null;
      overlayRef.current = null;
      referenceLayerRef.current = null;
      segmentsLayerRef.current = null;
      neighborLinksLayerRef.current = null;
      markersLayerRef.current = null;
      geocodedRef.current = false;
      initialViewportCapturedRef.current = false;
      setMapReady(false);
    };
  }, [workspace.id]);

  useEffect(() => {
    let disposed = false;
    const container = containerRef.current;
    if (!container) {
      return;
    }

    if (mapRef.current) {
      const map = mapRef.current;
      map.invalidateSize({ animate: false });
      onReadyRef.current(
        createMapHandle(map, {
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

      baseLayerRef.current = createBaseLayer(
        L,
        workspace.baseMapStyle,
        localTileUrl,
        mapboxTokenRef.current,
      ).addTo(map);
      referenceLayerRef.current = L.layerGroup().addTo(map);
      segmentsLayerRef.current = L.layerGroup().addTo(map);
      neighborLinksLayerRef.current = L.layerGroup().addTo(map);
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

      let resizeTimer: number | undefined;
      const observer = new ResizeObserver(() => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
          map.invalidateSize({ animate: false });
        }, 150);
      });
      observer.observe(containerRef.current);
      return () => {
        observer.disconnect();
        window.clearTimeout(resizeTimer);
      };
    }

    const cleanupPromise = initMap();
    return () => {
      disposed = true;
      void cleanupPromise.then((cleanup) => cleanup?.());
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
      const neighborLinksLayer = neighborLinksLayerRef.current;
      const markersLayer = markersLayerRef.current;

      if (referenceLayer) {
        map.removeLayer(referenceLayer);
      }
      if (segmentsLayer) {
        map.removeLayer(segmentsLayer);
      }
      if (neighborLinksLayer) {
        map.removeLayer(neighborLinksLayer);
      }
      if (markersLayer) {
        map.removeLayer(markersLayer);
      }

      baseLayerRef.current?.remove();
      baseLayerRef.current = createBaseLayer(
        L,
        workspace.baseMapStyle,
        localTileUrl,
        mapboxToken,
      ).addTo(map);

      if (referenceLayer) {
        referenceLayer.addTo(map);
      }
      if (segmentsLayer) {
        segmentsLayer.addTo(map);
      }
      if (neighborLinksLayer) {
        neighborLinksLayer.addTo(map);
      }
      if (markersLayer) {
        markersLayer.addTo(map);
      }
    }

    void swapBaseLayer();
  }, [localTileUrl, workspace.baseMapStyle, mapboxToken]);

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

    if (!mapRef.current || !leafletRef.current) {
      return;
    }

    const mapForInspect: import("leaflet").Map = mapRef.current;
    const leafletForInspect: typeof import("leaflet") = leafletRef.current;

    function closeInspectTooltip() {
      if (inspectTooltipRef.current) {
        mapForInspect.closeTooltip(inspectTooltipRef.current);
        inspectTooltipRef.current = null;
      }
      setReferenceInspectCopyTarget(null);
    }

    function handleInspectMove(event: import("leaflet").LeafletMouseEvent) {
      const guides = referenceGuidesRef.current;
      if (!showReferenceOverlay || !showReferenceInspectTooltip || guides.length === 0) {
        closeInspectTooltip();
        return;
      }

      const nearest = findNearestPointOnGuides(event.latlng.lat, event.latlng.lng, guides);

      if (!nearest || nearest.distanceMeters > REFERENCE_INSPECT_MAX_DISTANCE_METERS) {
        closeInspectTooltip();
        return;
      }

      const hover = {
        cursorLatitude: event.latlng.lat,
        cursorLongitude: event.latlng.lng,
        nearest,
      };
      setReferenceInspectCopyTarget(buildReferenceInspectCopyTarget(hover));
      const content = buildReferenceInspectTooltipContent(hover);

      if (!inspectTooltipRef.current) {
        inspectTooltipRef.current = leafletForInspect.tooltip({
          sticky: true,
          direction: "top",
          opacity: 0.96,
          className: "reference-inspect-tooltip",
        });
      }

      inspectTooltipRef.current.setLatLng(event.latlng).setContent(content).openOn(mapForInspect);
    }

    mapForInspect.on("mousemove", handleInspectMove);
    mapForInspect.on("mouseout", closeInspectTooltip);

    return () => {
      mapForInspect.off("mousemove", handleInspectMove);
      mapForInspect.off("mouseout", closeInspectTooltip);
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

          const isSelected =
            segment.id === selectedSegmentId || segment.segmentGroupId === highlightedPathGroupId;
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

      for (const link of pathSegmentLinks) {
        const coordinates = link.geometry?.coordinates;
        if (!coordinates || coordinates.length < 2) {
          continue;
        }
        L.polyline(lineStringToLatLngs(coordinates), {
          color: "#16a34a",
          weight: 6,
          opacity: 0.9,
          lineCap: "round",
          lineJoin: "round",
        })
          .bindTooltip(`${link.fromRef} → ${link.toRef}`)
          .addTo(segmentsLayer);
      }

      for (const edge of virtualPreviewEdges) {
        const coordinates = edge.geometry.coordinates;
        if (coordinates.length < 2) {
          continue;
        }
        L.polyline(lineStringToLatLngs(coordinates), {
          color: segmentGroupColor(edge.pathSlug),
          weight: 5,
          opacity: 0.82,
          dashArray: "7 5",
          lineCap: "round",
          lineJoin: "round",
        })
          .bindTooltip(`${edge.fromRef} → ${edge.toRef}`)
          .addTo(segmentsLayer);
      }
    })();
  }, [
    editingSegmentId,
    geoSegments,
    highlightedPathGroupId,
    mapReady,
    pathSegmentLinks,
    pendingTracePoints,
    selectedSegmentId,
    virtualPreviewEdges,
  ]);

  useEffect(() => {
    if (!mapReady) {
      return;
    }

    void (async () => {
      const L = await import("leaflet");
      const neighborLinksLayer = neighborLinksLayerRef.current;
      if (!neighborLinksLayer) {
        return;
      }

      neighborLinksLayer.clearLayers();

      for (const edge of neighborLinkOverlayEdges) {
        const color = neighborLinkOverlayColor(edge.isLongJump);
        const latLngs = lineStringToLatLngs(edge.coordinates);
        L.polyline(latLngs, {
          color,
          weight: edge.isLongJump ? 3 : 2,
          opacity: edge.isLongJump ? 0.95 : 0.72,
          dashArray: edge.isLongJump ? "6 4" : undefined,
          lineCap: "round",
          lineJoin: "round",
        })
          .bindTooltip(`${edge.fromRef} → ${edge.toRef} · ${Math.round(edge.distanceMeters)} m`)
          .addTo(neighborLinksLayer);

        const arrowLat = edge.arrowCoordinate[1];
        const arrowLng = edge.arrowCoordinate[0];
        L.marker([arrowLat, arrowLng], {
          interactive: false,
          icon: L.divIcon({
            className: "",
            html: `<div style="margin-left:-7px;margin-top:-7px;width:14px;height:14px;display:flex;align-items:center;justify-content:center;transform:rotate(${edge.arrowBearing}deg);color:${color};font-size:13px;line-height:1;font-weight:700;">▶</div>`,
            iconSize: [14, 14],
          }),
        }).addTo(neighborLinksLayer);
      }
    })();
  }, [mapReady, neighborLinkOverlayEdges]);

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
      const markerCursor = controlPointDragEnabled ? "grab" : "default";
      const marker = L.marker([point.latitude, point.longitude], {
        draggable: controlPointDragEnabled,
        icon: L.divIcon({
          className: "",
          html: `<div style="margin-left:-12px;margin-top:-12px;width:24px;height:24px;border-radius:9999px;border:2px solid white;background:${fillColor};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:white;cursor:${markerCursor};">${displayLabel}</div>`,
          iconSize: [24, 24],
        }),
      }).addTo(markersLayer);

      if (controlPointDragEnabled) {
        marker.on("dragend", () => {
          const { lat, lng } = marker.getLatLng();
          onControlPointMapMoveRef.current?.(point.id, lat, lng);
        });
      }

      marker.on("click", (event) => {
        L.DomEvent.stopPropagation(event);
        onControlPointClickRef.current?.(point.id);
      });
    });

    if (linkMode && linkChainPointIds.length >= 2) {
      const chainCoordinates = linkChainPointIds
        .map((pointId) => mapPoints.find((point) => point.id === pointId))
        .filter((point): point is NonNullable<typeof point> => point !== undefined)
        .map((point) => ({ lat: point.latitude, lng: point.longitude }));
      if (chainCoordinates.length >= 2) {
        L.polyline(chainCoordinates, {
          color: "#0ea5e9",
          weight: 5,
          opacity: 0.95,
          dashArray: "10 8",
        }).addTo(markersLayer);
      }
    }

    const chainSet = new Set(linkChainPointIds);
    const chainIndexById = new Map(linkChainPointIds.map((pointId, index) => [pointId, index + 1]));
    const suggestionSet = new Set(linkSuggestionPointIds);
    const routeViaSet = new Set(linkRouteViaIds);
    const neighborLinkSet = new Set(markerIdsWithNeighborLinks);
    const pinSize = linkMode ? 26 : 18;
    const pinOffset = linkMode ? -13 : -9;

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
        isRouteStart: point.id === linkRouteStartId,
        isRouteEnd: point.id === linkRouteEndId,
        isRouteVia: routeViaSet.has(point.id),
        showNeighborCoverage,
        markerIdsWithNeighborLinks: neighborLinkSet,
      };
      const ring = resolveMapPointMarkerRing(appearanceInput);
      const baseLabel = point.ref ?? point.name ?? "";
      const label =
        chainIndex !== undefined && baseLabel ? `${chainIndex}:${baseLabel}` : baseLabel;
      const pointDraggable = mapPointDragEnabled || point.id === draggableMapPointId;
      const markerCursor = pointDraggable ? "grab" : "pointer";
      const halo = resolveMapPointMarkerHalo(ring, appearanceInput);
      const marker = L.marker([point.latitude, point.longitude], {
        draggable: pointDraggable,
        icon: L.divIcon({
          className: "",
          html: `<div style="margin-left:${pinOffset}px;margin-top:${pinOffset}px;display:flex;align-items:center;gap:4px;cursor:${markerCursor};"><div style="width:${pinSize}px;height:${pinSize}px;transform:rotate(45deg);border:2px solid ${ring};background:${color};${halo}"></div>${label ? `<span style="transform:translateY(-1px);font-size:${linkMode ? 11 : 10}px;font-weight:700;color:#0f172a;background:rgba(255,255,255,0.9);border-radius:4px;padding:0 4px;white-space:nowrap;">${label}</span>` : ""}</div>`,
          iconSize: [pinSize, pinSize],
        }),
      }).addTo(markersLayer);

      if (pointDraggable) {
        marker.on("dragend", () => {
          const { lat, lng } = marker.getLatLng();
          onMapPointMapMoveRef.current?.(point.id, lat, lng);
        });
      }

      marker.on("click", (event) => {
        L.DomEvent.stopPropagation(event);
        onMapPointClickRef.current?.(point.id, {
          ctrlKey: event.originalEvent.ctrlKey,
          metaKey: event.originalEvent.metaKey,
        });
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
  }, [
    controlPointDragEnabled,
    controlPoints,
    draggableMapPointId,
    mapPointDragEnabled,
    mapPoints,
    selectedMapPointId,
    linkChainPointIds,
    linkFromPointId,
    linkMode,
    linkSuggestionPointIds,
    linkRouteStartId,
    linkRouteEndId,
    linkRouteViaIds,
    mapReady,
    pendingMapPoint,
    pendingTracePoints,
    selectedControlPointId,
    showNeighborCoverage,
    markerIdsWithNeighborLinks,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    function handleClick(event: import("leaflet").LeafletMouseEvent) {
      const domEvent = event.originalEvent;
      const modifier = isPickModifierEvent(domEvent);

      if (canCaptureMapPoint && !modifier) {
        domEvent.preventDefault();
        onMapMarkerCaptureRef.current?.(event.latlng.lat, event.latlng.lng);
        return;
      }

      if (!modifier) {
        return;
      }

      domEvent.preventDefault();

      if (mapClickTimerRef.current !== undefined) {
        window.clearTimeout(mapClickTimerRef.current);
      }

      mapClickTimerRef.current = window.setTimeout(() => {
        if (canPlaceMapPoint) {
          onMapMarkerCaptureRef.current?.(event.latlng.lat, event.latlng.lng);
          return;
        }

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
    const activePickMode =
      canCaptureMapPoint ||
      ((canPickMapPoint || canPickTracePoint || canPlaceMapPoint) && pickModifierHeld);
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
  }, [canPickMapPoint, canPickTracePoint, canPlaceMapPoint, canCaptureMapPoint, pickModifierHeld]);

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
    </div>
  );
}
