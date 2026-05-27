import { boundsFromCorners, estimateTileCount } from "@repo/tile-cache/tile-math";
import { useEffect, useMemo, useRef } from "react";
import type { MapBaseMapStyle } from "@shared/maps.types";
import type { TileCacheCorner } from "@shared/tile-cache.types";
import { createBaseLayer, DEFAULT_MAP_VIEWPORT, geocodePlace } from "../lib/map-handle";

type WizardBoundsMapProps = {
  corners: TileCacheCorner[];
  locationQuery: string;
  latitude: string;
  longitude: string;
  style: MapBaseMapStyle;
  onCornerAdd: (corner: TileCacheCorner) => void;
};

export function WizardBoundsMap({
  corners,
  locationQuery,
  latitude,
  longitude,
  style,
  onCornerAdd,
}: WizardBoundsMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const overlayRef = useRef<import("leaflet").Rectangle | null>(null);
  const onCornerAddRef = useRef(onCornerAdd);

  onCornerAddRef.current = onCornerAdd;

  const previewBounds = useMemo(() => {
    if (corners.length !== 4) {
      return null;
    }
    return boundsFromCorners(corners);
  }, [corners]);

  const estimatedTiles = useMemo(() => {
    if (!previewBounds) {
      return null;
    }
    return estimateTileCount(previewBounds, 14, 17);
  }, [previewBounds]);

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

      createBaseLayer(L, style).addTo(map);
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
      markersLayerRef.current = null;
      overlayRef.current = null;
    };
  }, [latitude, locationQuery, longitude, style]);

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
        L.circleMarker([corner.latitude, corner.longitude], {
          radius: 8,
          color: "#ffffff",
          weight: 2,
          fillColor: "#16a34a",
          fillOpacity: 1,
        })
          .bindTooltip(String(index + 1), { permanent: true, direction: "top", offset: [0, -8] })
          .addTo(markersLayer);
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
        className="h-72 w-full overflow-hidden rounded-box border border-base-content/10"
      />
      {estimatedTiles != null ? (
        <p className="text-xs text-base-content/60">
          About {estimatedTiles.toLocaleString()} tiles will be cached (zoom 14–17).
        </p>
      ) : null}
    </div>
  );
}
