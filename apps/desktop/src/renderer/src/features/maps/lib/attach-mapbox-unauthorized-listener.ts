import type mapboxgl from "mapbox-gl";
import { isMapboxUnauthorizedError } from "@renderer/features/maps/lib/mapbox-auth-error";
import { setMapboxTokenInvalid } from "@renderer/features/maps/lib/mapbox-token-invalid-store";

export function attachMapboxUnauthorizedListener(
  map: mapboxgl.Map,
  onUnauthorized?: () => void,
): () => void {
  function handleError(event: mapboxgl.ErrorEvent) {
    if (!isMapboxUnauthorizedError(event.error)) {
      return;
    }
    setMapboxTokenInvalid(true);
    onUnauthorized?.();
  }

  map.on("error", handleError);
  return () => {
    map.off("error", handleError);
  };
}
