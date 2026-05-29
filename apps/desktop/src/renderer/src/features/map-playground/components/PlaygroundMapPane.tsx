import {
  analyzeTrailFeature,
  buildTrailHoverTooltipContent,
  formatDistance,
} from "@renderer/features/map-playground/lib/analyze-trail-feature";
import {
  coordinatesToLatLngs,
  getFeatureKey,
} from "@renderer/features/map-playground/lib/parse-playground-geojson";
import { trailFeatureColor } from "@renderer/features/map-playground/lib/trail-colors";
import { createBaseLayer } from "@renderer/features/maps/lib/map-handle";
import type {
  PlaygroundBaseMapStyle,
  PlaygroundLayer,
  PlaygroundSelectedFeature,
} from "@renderer/types/map-playground.types";
import type { PlaygroundFeature } from "@renderer/types/map-playground.types";
import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";

type PlaygroundMapPaneProps = {
  layers: PlaygroundLayer[];
  selectedFeature: PlaygroundSelectedFeature | null;
  baseMapStyle: PlaygroundBaseMapStyle;
  initialViewport: {
    latitude: number;
    longitude: number;
    zoom: number;
  };
  onFeatureSelect: (layerId: string, featureKey: string) => void;
};

function buildTooltipContent(feature: PlaygroundFeature) {
  const stats = analyzeTrailFeature(feature);
  const parts = [stats.name];
  if (stats.difficulty) {
    parts.push(stats.difficulty);
  }
  if (stats.lengthMeters !== null) {
    parts.push(formatDistance(stats.lengthMeters));
  }
  return parts.join(" · ");
}

function isFeatureVisible(layer: PlaygroundLayer, featureKey: string) {
  return layer.visible && !layer.hiddenFeatureKeys.includes(featureKey);
}

export function PlaygroundMapPane({
  layers,
  selectedFeature,
  baseMapStyle,
  initialViewport,
  onFeatureSelect,
}: PlaygroundMapPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const baseLayerRef = useRef<Leaflet.Layer | null>(null);
  const trailsLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const highlightLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const onFeatureSelectRef = useRef(onFeatureSelect);
  const initialViewportRef = useRef(initialViewport);
  const hasAppliedInitialStyleRef = useRef(false);
  const previousLayerCountRef = useRef(0);
  const previousSelectionRef = useRef<PlaygroundSelectedFeature | null>(null);
  const [mapReady, setMapReady] = useState(false);

  onFeatureSelectRef.current = onFeatureSelect;
  initialViewportRef.current = initialViewport;

  useEffect(() => {
    let cancelled = false;
    let resizeTimer: number | undefined;
    let resizeObserver: ResizeObserver | undefined;

    async function createMap() {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current || mapRef.current) {
        return;
      }

      leafletRef.current = L;
      const startingViewport = initialViewportRef.current;
      const map = L.map(containerRef.current, {
        center: [startingViewport.latitude, startingViewport.longitude],
        zoom: startingViewport.zoom,
        zoomControl: true,
      });

      baseLayerRef.current = createBaseLayer(L, baseMapStyle).addTo(map);
      trailsLayerRef.current = L.layerGroup().addTo(map);
      highlightLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      hasAppliedInitialStyleRef.current = true;

      setMapReady(true);
      resizeTimer = window.setTimeout(() => map.invalidateSize(), 100);

      if (containerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          map.invalidateSize();
        });
        resizeObserver.observe(containerRef.current);
      }
    }

    void createMap();

    return () => {
      cancelled = true;
      hasAppliedInitialStyleRef.current = false;
      setMapReady(false);
      resizeObserver?.disconnect();
      if (resizeTimer !== undefined) {
        window.clearTimeout(resizeTimer);
      }
      mapRef.current?.remove();
      mapRef.current = null;
      baseLayerRef.current = null;
      trailsLayerRef.current = null;
      highlightLayerRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!hasAppliedInitialStyleRef.current) {
      return;
    }

    const map = mapRef.current;
    const L = leafletRef.current;
    const currentLayer = baseLayerRef.current;

    if (!map || !L || !currentLayer) {
      return;
    }

    map.removeLayer(currentLayer);
    const nextLayer = createBaseLayer(L, baseMapStyle).addTo(map);
    baseLayerRef.current = nextLayer;
    if ("bringToBack" in nextLayer && typeof nextLayer.bringToBack === "function") {
      nextLayer.bringToBack();
    }
    trailsLayerRef.current?.addTo(map);
    highlightLayerRef.current?.addTo(map);
  }, [baseMapStyle]);

  useEffect(() => {
    if (!mapReady) {
      return;
    }

    const L = leafletRef.current;
    const trailsLayer = trailsLayerRef.current;
    const highlightLayer = highlightLayerRef.current;
    const map = mapRef.current;

    if (!L || !trailsLayer || !highlightLayer || !map) {
      return;
    }

    trailsLayer.clearLayers();
    highlightLayer.clearLayers();
    const boundsPoints: Leaflet.LatLngExpression[] = [];
    let selectedLatLngs: Array<[number, number]> | undefined;

    for (const layer of layers) {
      for (const feature of layer.features) {
        const featureKey = getFeatureKey(feature);
        if (!isFeatureVisible(layer, featureKey)) {
          continue;
        }

        const isSelected =
          selectedFeature?.layerId === layer.id && selectedFeature.featureKey === featureKey;
        const color = trailFeatureColor(featureKey);
        const latlngs = coordinatesToLatLngs(feature.geometry.coordinates);
        for (const point of latlngs) {
          boundsPoints.push([point.lat, point.lng]);
        }

        if (isSelected) {
          selectedLatLngs = latlngs.map((point) => [point.lat, point.lng]);
        }

        const defaultTooltip = buildTooltipContent(feature);
        const polyline = L.polyline(latlngs, {
          color,
          weight: isSelected ? 5 : 4,
          opacity: isSelected ? 0.35 : 0.88,
        })
          .bindTooltip(defaultTooltip, {
            sticky: true,
            direction: "top",
            className: "playground-trail-tooltip",
          })
          .addTo(trailsLayer)
          .on("click", () => {
            onFeatureSelectRef.current(layer.id, featureKey);
          })
          .on("mousemove", (event) => {
            polyline.setTooltipContent(
              buildTrailHoverTooltipContent(feature, event.latlng.lat, event.latlng.lng),
            );
            polyline.openTooltip(event.latlng);
          })
          .on("mouseout", () => {
            polyline.setTooltipContent(defaultTooltip);
          });
      }
    }

    if (selectedLatLngs && selectedLatLngs.length >= 2) {
      L.polyline(selectedLatLngs, {
        color: "#ffffff",
        weight: 9,
        opacity: 0.95,
        className: "playground-trail-highlight-glow",
        interactive: false,
      }).addTo(highlightLayer);

      L.polyline(selectedLatLngs, {
        color: "#16a34a",
        weight: 6,
        opacity: 1,
        className: "playground-trail-highlight",
        interactive: false,
      }).addTo(highlightLayer);
    }

    if (layers.length > previousLayerCountRef.current && boundsPoints.length > 0) {
      map.fitBounds(L.latLngBounds(boundsPoints), { padding: [48, 48], maxZoom: 16 });
    }

    const selectionChanged =
      previousSelectionRef.current?.layerId !== selectedFeature?.layerId ||
      previousSelectionRef.current?.featureKey !== selectedFeature?.featureKey;

    if (selectionChanged && selectedLatLngs && selectedLatLngs.length >= 2) {
      map.fitBounds(L.latLngBounds(selectedLatLngs), { padding: [72, 72], maxZoom: 17 });
    }

    previousLayerCountRef.current = layers.length;
    previousSelectionRef.current = selectedFeature;
  }, [layers, mapReady, selectedFeature]);

  return (
    <div
      ref={containerRef}
      data-test="playground-map-pane"
      className="playground-map-pane absolute inset-0 z-0 h-full w-full"
    />
  );
}
