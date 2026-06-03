import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  coordinatesToLatLngs,
  getFeatureKey,
} from "@renderer/features/map-playground/lib/parse-playground-geojson";
import {
  collectPlaygroundTrailBounds,
  type PlaygroundViewport,
} from "@renderer/features/map-playground/lib/playground-viewport";
import { trailFeatureColor } from "@renderer/features/map-playground/lib/trail-colors";
import { useMapboxTokenQuery } from "@renderer/features/maps/hooks/useMapboxToken";
import {
  MAPBOX_GL_STYLES,
  resolveMapboxGlStyleId,
} from "@renderer/features/maps/lib/mapbox-gl-styles";
import { MapboxTokenRequiredModal } from "@renderer/features/maps/components/MapboxTokenRequiredModal";
import type {
  PlaygroundBaseMapStyle,
  PlaygroundLayer,
  PlaygroundSelectedFeature,
} from "@renderer/types/map-playground.types";

const TRAILS_SOURCE_ID = "playground-trails";
const TRAILS_LAYER_ID = "playground-trails-line";

type PlaygroundMapboxGlPaneProps = {
  layers: PlaygroundLayer[];
  selectedFeature: PlaygroundSelectedFeature | null;
  baseMapStyle: PlaygroundBaseMapStyle;
  sharedViewportRef: MutableRefObject<PlaygroundViewport>;
  onViewportChange: (viewport: PlaygroundViewport) => void;
  onFeatureSelect: (layerId: string, featureKey: string) => void;
};

function isFeatureVisible(layer: PlaygroundLayer, featureKey: string): boolean {
  return layer.visible && !layer.hiddenFeatureKeys.includes(featureKey);
}

function buildTrailFeatures(
  layers: PlaygroundLayer[],
  selectedFeature: PlaygroundSelectedFeature | null,
) {
  const hasActiveSelection = selectedFeature !== null;
  return layers.flatMap((layer) =>
    layer.features.flatMap((feature) => {
      const featureKey = getFeatureKey(feature);
      if (!isFeatureVisible(layer, featureKey)) {
        return [];
      }
      const latlngs = coordinatesToLatLngs(feature.geometry.coordinates);
      if (latlngs.length < 2) {
        return [];
      }
      const isSelected =
        selectedFeature?.layerId === layer.id && selectedFeature.featureKey === featureKey;
      return [
        {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: latlngs.map((point) => [point.lng, point.lat]),
          },
          properties: {
            layerId: layer.id,
            featureKey,
            color: trailFeatureColor(featureKey),
            width: isSelected ? 6 : 4,
            opacity: hasActiveSelection && !isSelected ? 0.45 : isSelected ? 1 : 0.88,
          },
        },
      ];
    }),
  );
}

function fitMapToPoints(
  map: mapboxgl.Map,
  points: Array<{ latitude: number; longitude: number }>,
  options: { padding: number; maxZoom: number },
) {
  if (points.length === 0) {
    return;
  }

  const bounds = new mapboxgl.LngLatBounds();
  for (const point of points) {
    bounds.extend([point.longitude, point.latitude]);
  }
  map.fitBounds(bounds, {
    padding: options.padding,
    maxZoom: options.maxZoom,
    duration: 0,
  });
}

export function PlaygroundMapboxGlPane({
  layers,
  selectedFeature,
  baseMapStyle,
  sharedViewportRef,
  onViewportChange,
  onFeatureSelect,
}: PlaygroundMapboxGlPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const onFeatureSelectRef = useRef(onFeatureSelect);
  const onViewportChangeRef = useRef(onViewportChange);
  const sharedViewportRefRef = useRef(sharedViewportRef);
  const dataRef = useRef({ layers, selectedFeature });
  const previousLayerCountRef = useRef(0);
  const previousSelectionRef = useRef<PlaygroundSelectedFeature | null>(null);
  const appliedStyleIdRef = useRef<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const token = useMapboxTokenQuery().data ?? null;
  const styleId = resolveMapboxGlStyleId(null, baseMapStyle);

  onFeatureSelectRef.current = onFeatureSelect;
  onViewportChangeRef.current = onViewportChange;
  sharedViewportRefRef.current = sharedViewportRef;
  dataRef.current = { layers, selectedFeature };

  function emitViewportFromMap(map: mapboxgl.Map) {
    const center = map.getCenter();
    const viewport: PlaygroundViewport = {
      latitude: center.lat,
      longitude: center.lng,
      zoom: map.getZoom(),
    };
    sharedViewportRefRef.current.current = viewport;
    onViewportChangeRef.current(viewport);
  }

  function applySharedViewport(map: mapboxgl.Map) {
    const viewport = sharedViewportRefRef.current.current;
    map.jumpTo({
      center: [viewport.longitude, viewport.latitude],
      zoom: viewport.zoom,
    });
  }

  function syncTrails(map: mapboxgl.Map) {
    if (!map.isStyleLoaded()) {
      return;
    }

    const { layers: currentLayers, selectedFeature: selection } = dataRef.current;
    const features = buildTrailFeatures(currentLayers, selection);
    const collection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features,
    };

    const existing = map.getSource(TRAILS_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (existing) {
      existing.setData(collection);
    } else {
      map.addSource(TRAILS_SOURCE_ID, { type: "geojson", data: collection });
    }

    if (!map.getLayer(TRAILS_LAYER_ID)) {
      map.addLayer({
        id: TRAILS_LAYER_ID,
        type: "line",
        source: TRAILS_SOURCE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["get", "width"],
          "line-opacity": ["get", "opacity"],
        },
      });
    }

    const { allPoints, selectedPoints } = collectPlaygroundTrailBounds(currentLayers, selection);
    const selectionChanged =
      previousSelectionRef.current?.layerId !== selection?.layerId ||
      previousSelectionRef.current?.featureKey !== selection?.featureKey;

    if (selectionChanged && selectedPoints && selectedPoints.length >= 2) {
      fitMapToPoints(map, selectedPoints, { padding: 72, maxZoom: 17 });
      emitViewportFromMap(map);
    } else if (
      currentLayers.length > previousLayerCountRef.current &&
      allPoints.length > 0 &&
      sharedViewportRefRef.current.current.zoom <= 3
    ) {
      fitMapToPoints(map, allPoints, { padding: 48, maxZoom: 16 });
      emitViewportFromMap(map);
    }

    previousLayerCountRef.current = currentLayers.length;
    previousSelectionRef.current = selection;
  }

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      appliedStyleIdRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !token) {
      return;
    }

    if (mapRef.current) {
      applySharedViewport(mapRef.current);
      mapRef.current.resize();
      syncTrails(mapRef.current);
      return;
    }

    mapboxgl.accessToken = token;
    const viewport = sharedViewportRefRef.current.current;
    const map = new mapboxgl.Map({
      container,
      style: MAPBOX_GL_STYLES[styleId],
      center: [viewport.longitude, viewport.latitude],
      zoom: viewport.zoom,
      attributionControl: true,
      preserveDrawingBuffer: true,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;
    appliedStyleIdRef.current = styleId;

    function handleStyleReady() {
      syncTrails(map);
    }

    map.on("style.load", handleStyleReady);
    map.on("load", () => {
      setMapReady(true);
      handleStyleReady();
    });

    map.on("moveend", () => emitViewportFromMap(map));
    map.on("zoomend", () => emitViewportFromMap(map));

    map.on("click", TRAILS_LAYER_ID, (event) => {
      const feature = event.features?.[0];
      const layerId = feature?.properties?.layerId;
      const featureKey = feature?.properties?.featureKey;
      if (typeof layerId === "string" && typeof featureKey === "string") {
        onFeatureSelectRef.current(layerId, featureKey);
      }
    });

    map.on("mouseenter", TRAILS_LAYER_ID, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", TRAILS_LAYER_ID, () => {
      map.getCanvas().style.cursor = "";
    });

    const observer = new ResizeObserver(() => {
      map.resize();
    });
    observer.observe(container);

    return () => {
      emitViewportFromMap(map);
      observer.disconnect();
    };
  }, [styleId, token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || appliedStyleIdRef.current === styleId) {
      return;
    }

    appliedStyleIdRef.current = styleId;

    function handleStyleReady() {
      const activeMap = mapRef.current;
      if (!activeMap) {
        return;
      }
      applySharedViewport(activeMap);
      syncTrails(activeMap);
    }

    map.once("style.load", handleStyleReady);
    map.setStyle(MAPBOX_GL_STYLES[styleId]);

    return () => {
      map.off("style.load", handleStyleReady);
    };
  }, [mapReady, styleId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }
    syncTrails(map);
  }, [layers, mapReady, selectedFeature]);

  if (!token) {
    return (
      <div className="absolute inset-0 z-0 bg-base-200">
        <MapboxTokenRequiredModal />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-test="playground-mapbox-pane"
      className="playground-map-pane absolute inset-0 z-0 h-full w-full"
    />
  );
}
