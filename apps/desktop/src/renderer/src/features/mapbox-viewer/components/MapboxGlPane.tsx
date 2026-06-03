import {
  MAPBOX_GL_STYLES,
  type MapboxGlStyleId,
} from "@renderer/features/mapbox-viewer/lib/mapbox-styles";
import type { MapboxFeatureProbe } from "@renderer/features/mapbox-viewer/lib/mapbox-probe.types";
import type { MapViewport } from "@renderer/features/maps/lib/map-handle";
import type { MapboxGroundCaptureRecord } from "@shared/mapbox-capture.types";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";

export type { MapboxFeatureProbe } from "@renderer/features/mapbox-viewer/lib/mapbox-probe.types";

export type MapboxFlyToTarget = {
  latitude: number;
  longitude: number;
  zoom?: number;
  key: number;
};

type MapboxGlPaneProps = {
  accessToken: string;
  styleId: MapboxGlStyleId;
  initialViewport: MapViewport;
  flyTo: MapboxFlyToTarget | null;
  inspectMode: boolean;
  probePinned: boolean;
  captures: MapboxGroundCaptureRecord[];
  showApprovedCaptures: boolean;
  showPendingCaptures: boolean;
  onHoverProbe: (probe: MapboxFeatureProbe | null) => void;
  onPinProbe: (probe: MapboxFeatureProbe) => void;
  onCaptureProbe: (probe: MapboxFeatureProbe) => void;
};

const CAPTURES_SOURCE_ID = "ground-captures";
const CAPTURES_LAYER_ID = "ground-captures-circles";

function buildCaptureGeoJson(
  captures: MapboxGroundCaptureRecord[],
  showApproved: boolean,
  showPending: boolean,
): GeoJSON.FeatureCollection {
  const features = captures
    .filter((capture) => (capture.approved ? showApproved : showPending))
    .map((capture) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [capture.longitude, capture.latitude],
      },
      properties: {
        id: capture.id,
        title: capture.title,
        approved: capture.approved,
      },
    }));

  return { type: "FeatureCollection", features };
}

export function MapboxGlPane({
  accessToken,
  styleId,
  initialViewport,
  flyTo,
  inspectMode,
  probePinned,
  captures,
  showApprovedCaptures,
  showPendingCaptures,
  onHoverProbe,
  onPinProbe,
  onCaptureProbe,
}: MapboxGlPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const appliedStyleIdRef = useRef<MapboxGlStyleId | null>(null);
  const onHoverProbeRef = useRef(onHoverProbe);
  const onPinProbeRef = useRef(onPinProbe);
  const onCaptureProbeRef = useRef(onCaptureProbe);
  const inspectModeRef = useRef(inspectMode);
  const probePinnedRef = useRef(probePinned);
  const capturesRef = useRef(captures);
  const showApprovedRef = useRef(showApprovedCaptures);
  const showPendingRef = useRef(showPendingCaptures);

  capturesRef.current = captures;
  showApprovedRef.current = showApprovedCaptures;
  showPendingRef.current = showPendingCaptures;

  onHoverProbeRef.current = onHoverProbe;
  onPinProbeRef.current = onPinProbe;
  onCaptureProbeRef.current = onCaptureProbe;
  inspectModeRef.current = inspectMode;
  probePinnedRef.current = probePinned;

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    mapboxgl.accessToken = accessToken;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_GL_STYLES[styleId],
      center: [initialViewport.longitude, initialViewport.latitude],
      zoom: initialViewport.zoom,
      attributionControl: true,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;
    appliedStyleIdRef.current = styleId;

    function enableTerrainIfAvailable() {
      if (!map.getSource("mapbox-dem")) {
        return;
      }
      map.setTerrain({ source: "mapbox-dem", exaggeration: 1 });
    }

    function syncCaptureLayer() {
      const data = buildCaptureGeoJson(
        capturesRef.current,
        showApprovedRef.current,
        showPendingRef.current,
      );
      const existing = map.getSource(CAPTURES_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
      if (existing) {
        existing.setData(data);
        return;
      }
      map.addSource(CAPTURES_SOURCE_ID, { type: "geojson", data });
      map.addLayer({
        id: CAPTURES_LAYER_ID,
        type: "circle",
        source: CAPTURES_SOURCE_ID,
        paint: {
          "circle-color": ["case", ["get", "approved"], "#22c55e", "#f59e0b"],
          "circle-radius": 7,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
    }

    function onStyleReady() {
      enableTerrainIfAvailable();
      syncCaptureLayer();
    }

    map.on("style.load", onStyleReady);
    if (map.isStyleLoaded()) {
      onStyleReady();
    }

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

    function probeAtPoint(event: mapboxgl.MapMouseEvent) {
      if (!inspectModeRef.current || probePinnedRef.current) {
        return;
      }

      const canvas = map.getCanvas();
      canvas.style.cursor = "crosshair";
      onHoverProbeRef.current(buildProbe(event));
    }

    function handleClick(event: mapboxgl.MapMouseEvent) {
      if (!inspectModeRef.current) {
        return;
      }

      const probe = buildProbe(event);
      const modifier = event.originalEvent.ctrlKey || event.originalEvent.metaKey;

      if (modifier) {
        onCaptureProbeRef.current(probe);
        return;
      }

      onPinProbeRef.current(probe);
    }

    function clearHover() {
      if (probePinnedRef.current) {
        return;
      }
      map.getCanvas().style.cursor = "";
      onHoverProbeRef.current(null);
    }

    map.on("mousemove", probeAtPoint);
    map.on("mouseout", clearHover);
    map.on("click", handleClick);

    return () => {
      map.off("style.load", onStyleReady);
      map.off("mousemove", probeAtPoint);
      map.off("mouseout", clearHover);
      map.off("click", handleClick);
      map.remove();
      mapRef.current = null;
      appliedStyleIdRef.current = null;
    };
  }, [accessToken, initialViewport.latitude, initialViewport.longitude, initialViewport.zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getSource(CAPTURES_SOURCE_ID)) {
      return;
    }
    const source = map.getSource(CAPTURES_SOURCE_ID) as mapboxgl.GeoJSONSource;
    source.setData(buildCaptureGeoJson(captures, showApprovedCaptures, showPendingCaptures));
  }, [captures, showApprovedCaptures, showPendingCaptures]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    if (!inspectMode) {
      map.getCanvas().style.cursor = "";
      if (!probePinnedRef.current) {
        onHoverProbeRef.current(null);
      }
    }
  }, [inspectMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || appliedStyleIdRef.current === styleId) {
      return;
    }

    const nextStyle = MAPBOX_GL_STYLES[styleId];

    function applyStyle() {
      if (!mapRef.current || appliedStyleIdRef.current === styleId) {
        return;
      }
      appliedStyleIdRef.current = styleId;
      mapRef.current.setStyle(nextStyle);
      if (!probePinnedRef.current) {
        onHoverProbeRef.current(null);
      }
    }

    if (map.isStyleLoaded()) {
      applyStyle();
      return;
    }

    map.once("load", applyStyle);
    return () => {
      map.off("load", applyStyle);
    };
  }, [styleId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTo) {
      return;
    }

    map.flyTo({
      center: [flyTo.longitude, flyTo.latitude],
      zoom: flyTo.zoom ?? 15,
      essential: true,
    });
  }, [flyTo?.key, flyTo?.latitude, flyTo?.longitude, flyTo?.zoom]);

  return (
    <div ref={containerRef} data-test="mapbox-gl-pane" className="absolute inset-0 h-full w-full" />
  );
}
