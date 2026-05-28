import { boundsFromCorners } from "@repo/tile-cache/tile-math";
import { useEffect, useMemo, useRef } from "react";
import type { MapBaseMapStyle } from "@shared/maps.types";
import type { TileCacheCorner } from "@shared/tile-cache.types";
import {
  createBaseLayer,
  DEFAULT_MAP_VIEWPORT,
  geocodePlace,
} from "@renderer/features/maps/lib/map-handle";

type BoundsPickerMapProps = {
  corners: TileCacheCorner[];
  locationQuery: string;
  latitude: string;
  longitude: string;
  style: MapBaseMapStyle;
  onCornerAdd: (corner: TileCacheCorner) => void;
  onCornerMove: (index: number, corner: TileCacheCorner) => void;
  mapHeightClassName?: string;
};

export function BoundsPickerMap({
  corners,
  locationQuery,
  latitude,
  longitude,
  style,
  onCornerAdd,
  onCornerMove,
  mapHeightClassName = "h-72",
}: BoundsPickerMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const baseLayerRef = useRef<import("leaflet").Layer | null>(null);
  const markersLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const overlayRef = useRef<import("leaflet").Rectangle | null>(null);
  const onCornerAddRef = useRef(onCornerAdd);
  const onCornerMoveRef = useRef(onCornerMove);
  const cornersCountRef = useRef(corners.length);

  onCornerAddRef.current = onCornerAdd;
  onCornerMoveRef.current = onCornerMove;
  cornersCountRef.current = corners.length;

  const previewBounds = useMemo(() => {
    if (corners.length !== 4) {
      return null;
    }
    return boundsFromCorners(corners);
  }, [corners]);

  useEffect(() => {
    let disposed = false;

    async function initMap() {
      const L = await import("leaflet");
      if (disposed || !containerRef.current || mapRef.current) {
        return;
      }

      const parsedLat = latitude.trim() ? Number(latitude) : DEFAULT_MAP_VIEWPORT.latitude;
      const parsedLng = longitude.trim() ? Number(longitude) : DEFAULT_MAP_VIEWPORT.longitude;

      const map = L.map(containerRef.current, {
        center: [parsedLat, parsedLng],
        zoom: 13,
        zoomControl: true,
        doubleClickZoom: false,
      });

      baseLayerRef.current = createBaseLayer(L, style).addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      if (locationQuery.trim()) {
        try {
          const result = await geocodePlace(locationQuery.trim());
          map.setView([result.lat, result.lng], Math.max(map.getZoom(), 13));
        } catch {
          map.setView([parsedLat, parsedLng], 13);
        }
      }

      map.on("click", (event) => {
        if (cornersCountRef.current >= 4) {
          return;
        }

        onCornerAddRef.current({
          latitude: event.latlng.lat,
          longitude: event.latlng.lng,
        });
      });

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
      markersLayerRef.current = null;
      overlayRef.current = null;
    };
  }, [latitude, locationQuery, longitude]);

  useEffect(() => {
    async function swapBaseLayer() {
      const map = mapRef.current;
      if (!map) {
        return;
      }

      const L = await import("leaflet");
      baseLayerRef.current?.remove();
      baseLayerRef.current = createBaseLayer(L, style).addTo(map);
    }

    void swapBaseLayer();
  }, [style]);

  useEffect(() => {
    async function updateMarkers() {
      const map = mapRef.current;
      const markersLayer = markersLayerRef.current;
      if (!map || !markersLayer) {
        return;
      }

      const L = await import("leaflet");
      markersLayer.clearLayers();
      overlayRef.current?.remove();

      corners.forEach((corner, index) => {
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:28px;height:28px;border-radius:9999px;background:#16a34a;border:2px solid white;color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;box-shadow:0 1px 4px rgba(0,0,0,0.35);cursor:grab;">${index + 1}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([corner.latitude, corner.longitude], {
          icon,
          draggable: true,
        });

        marker.on("dragend", () => {
          const position = marker.getLatLng();
          onCornerMoveRef.current(index, {
            latitude: position.lat,
            longitude: position.lng,
          });
        });

        marker.addTo(markersLayer);
      });

      if (corners.length === 4 && previewBounds) {
        overlayRef.current = L.rectangle(
          [
            [previewBounds.south, previewBounds.west],
            [previewBounds.north, previewBounds.east],
          ],
          {
            color: "#2563eb",
            weight: 2,
            fillOpacity: 0.08,
            dashArray: "6 4",
          },
        ).addTo(map);
      }
    }

    void updateMarkers();
  }, [corners, previewBounds]);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className={`${mapHeightClassName} w-full overflow-hidden rounded-box border border-base-content/10`}
      />
    </div>
  );
}
