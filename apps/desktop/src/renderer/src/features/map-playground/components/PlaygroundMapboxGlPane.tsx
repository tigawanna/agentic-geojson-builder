import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  coordinatesToLatLngs,
  getFeatureKey,
} from "@renderer/features/map-playground/lib/parse-playground-geojson";
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
  initialViewport: {
    latitude: number;
    longitude: number;
    zoom: number;
  };
  onFeatureSelect: (layerId: string, featureKey: string) => void;
};

function isFeatureVisible(layer: PlaygroundLayer, featureKey: string): boolean {
  return layer.visible && !layer.hiddenFeatureKeys.includes(featureKey);
}

export function PlaygroundMapboxGlPane({
  layers,
  selectedFeature,
  baseMapStyle,
  initialViewport,
  onFeatureSelect,
}: PlaygroundMapboxGlPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const onFeatureSelectRef = useRef(onFeatureSelect);
  const dataRef = useRef({ layers, selectedFeature });
  const [mapReady, setMapReady] = useState(false);

  const token = useMapboxTokenQuery().data ?? null;
  const styleId = resolveMapboxGlStyleId(null, baseMapStyle);

  onFeatureSelectRef.current = onFeatureSelect;
  dataRef.current = { layers, selectedFeature };

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !token) {
      return;
    }

    if (mapRef.current) {
      mapRef.current.resize();
      return;
    }

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container,
      style: MAPBOX_GL_STYLES[styleId],
      center: [initialViewport.longitude, initialViewport.latitude],
      zoom: initialViewport.zoom,
      attributionControl: true,
      preserveDrawingBuffer: true,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;

    function syncTrails() {
      if (!map.isStyleLoaded()) {
        return;
      }
      const { layers: currentLayers, selectedFeature: selection } = dataRef.current;
      const hasActiveSelection = selection !== null;
      const features = currentLayers.flatMap((layer) =>
        layer.features.flatMap((feature) => {
          const featureKey = getFeatureKey(feature);
          if (!isFeatureVisible(layer, featureKey)) {
            return [];
          }
          const latlngs = coordinatesToLatLngs(feature.geometry.coordinates);
          if (latlngs.length < 2) {
            return [];
          }
          const isSelected = selection?.layerId === layer.id && selection.featureKey === featureKey;
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
    }

    map.on("style.load", syncTrails);
    map.on("load", () => {
      setMapReady(true);
      syncTrails();
    });

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
      observer.disconnect();
    };
  }, [initialViewport.latitude, initialViewport.longitude, initialViewport.zoom, styleId, token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }
    const nextStyle = MAPBOX_GL_STYLES[styleId];
    if (map.isStyleLoaded()) {
      map.setStyle(nextStyle);
    }
  }, [mapReady, styleId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      return;
    }
    const { layers: currentLayers, selectedFeature: selection } = dataRef.current;
    const hasActiveSelection = selection !== null;
    const features = currentLayers.flatMap((layer) =>
      layer.features.flatMap((feature) => {
        const featureKey = getFeatureKey(feature);
        if (!isFeatureVisible(layer, featureKey)) {
          return [];
        }
        const latlngs = coordinatesToLatLngs(feature.geometry.coordinates);
        if (latlngs.length < 2) {
          return [];
        }
        const isSelected = selection?.layerId === layer.id && selection.featureKey === featureKey;
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
    const source = map.getSource(TRAILS_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    source?.setData({ type: "FeatureCollection", features });
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
