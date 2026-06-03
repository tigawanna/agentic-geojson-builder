import type mapboxgl from "mapbox-gl";
import { geocodePlace, type MapHandle } from "@renderer/features/maps/lib/map-handle";
import { captureMapboxPane } from "@renderer/features/maps/lib/rendered-map-view/capture-map-pane-mapbox";

export function createMapboxMapHandle(
  map: mapboxgl.Map,
  options: {
    setSuppressViewportSync: (value: boolean) => void;
    emitViewportChange: () => void;
  },
): MapHandle {
  function currentViewport() {
    const center = map.getCenter();
    return { latitude: center.lat, longitude: center.lng, zoom: map.getZoom() };
  }

  return {
    async panToQuery(query) {
      try {
        const result = await geocodePlace(query);
        options.setSuppressViewportSync(true);
        map.jumpTo({ center: [result.lng, result.lat], zoom: Math.max(map.getZoom(), 13) });
        options.emitViewportChange();
        options.setSuppressViewportSync(false);
        return {};
      } catch (error) {
        return { error: error instanceof Error ? error.message : "Location search failed." };
      }
    },
    setViewport(viewport) {
      options.setSuppressViewportSync(true);
      map.jumpTo({ center: [viewport.longitude, viewport.latitude], zoom: viewport.zoom });
      options.emitViewportChange();
      options.setSuppressViewportSync(false);
    },
    fitBounds(bounds, padding = 48) {
      options.setSuppressViewportSync(true);
      map.fitBounds(
        [
          [bounds.west, bounds.south],
          [bounds.east, bounds.north],
        ],
        { padding, maxZoom: 18, animate: false },
      );
      options.emitViewportChange();
      options.setSuppressViewportSync(false);
      return currentViewport();
    },
    getViewport() {
      return currentViewport();
    },
    captureView: async (overlays, captureOptions) => {
      const previous = currentViewport();

      if (captureOptions?.fitControlPoints && overlays.controlPoints.length > 0) {
        const latitudes = overlays.controlPoints.map((point) => point.latitude);
        const longitudes = overlays.controlPoints.map((point) => point.longitude);
        const south = Math.min(...latitudes);
        const north = Math.max(...latitudes);
        const west = Math.min(...longitudes);
        const east = Math.max(...longitudes);
        options.setSuppressViewportSync(true);
        map.fitBounds(
          [
            [west, south],
            [east, north],
          ],
          { padding: 48, maxZoom: 17, animate: false },
        );
        options.emitViewportChange();
        options.setSuppressViewportSync(false);
      }

      const capture = await captureMapboxPane(map, overlays);

      if (captureOptions?.fitControlPoints) {
        options.setSuppressViewportSync(true);
        map.jumpTo({ center: [previous.longitude, previous.latitude], zoom: previous.zoom });
        options.emitViewportChange();
        options.setSuppressViewportSync(false);
      }

      return capture;
    },
  };
}
