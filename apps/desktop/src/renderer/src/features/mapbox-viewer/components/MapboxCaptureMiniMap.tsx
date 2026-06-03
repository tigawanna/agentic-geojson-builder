import { MAPBOX_GL_STYLES } from "@renderer/features/mapbox-viewer/lib/mapbox-styles";
import type { MapboxGlStyleId } from "@renderer/features/mapbox-viewer/lib/mapbox-styles";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";

type MapboxCaptureMiniMapProps = {
  accessToken: string;
  latitude: number;
  longitude: number;
  styleId?: MapboxGlStyleId;
  approved: boolean;
};

export function MapboxCaptureMiniMap({
  accessToken,
  latitude,
  longitude,
  styleId = "outdoors",
  approved,
}: MapboxCaptureMiniMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    mapboxgl.accessToken = accessToken;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_GL_STYLES[styleId],
      center: [longitude, latitude],
      zoom: 16,
      interactive: true,
      attributionControl: false,
    });

    const marker = new mapboxgl.Marker({
      color: approved ? "#22c55e" : "#f59e0b",
    })
      .setLngLat([longitude, latitude])
      .addTo(map);

    return () => {
      marker.remove();
      map.remove();
    };
  }, [accessToken, approved, latitude, longitude, styleId]);

  return (
    <div
      ref={containerRef}
      data-test="mapbox-capture-mini-map"
      className="h-48 w-full overflow-hidden rounded-xl border border-base-300"
    />
  );
}
