import { buildTileUrlFallback } from "@repo/tile-cache/tile-url";
import type { MapBaseMapStyle } from "@shared/maps.types";
import type {
  MapCaptureOverlayInput,
  RenderedMapViewMapPane,
} from "@shared/rendered-map-view.types";
import { captureMapPaneFromDom } from "./rendered-map-view/capture-map-pane";

export type MapViewport = {
  latitude: number;
  longitude: number;
  zoom: number;
};

export type MapHandle = {
  panToQuery: (query: string) => Promise<{ error?: string }>;
  setViewport: (viewport: MapViewport) => void;
  captureView: (
    overlays: MapCaptureOverlayInput,
    options?: { fitControlPoints?: boolean },
  ) => Promise<RenderedMapViewMapPane>;
};

export const DEFAULT_MAP_VIEWPORT: MapViewport = {
  latitude: -1.286389,
  longitude: 36.817223,
  zoom: 13,
};

export const BASE_MAP_CONFIG: Record<
  MapBaseMapStyle,
  { url: string; attribution: string; maxZoom: number }
> = {
  outline: {
    url: "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap &copy; CARTO",
    maxZoom: 20,
  },
  standard: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap",
    maxZoom: 19,
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    maxZoom: 19,
  },
};

export async function geocodePlace(query: string) {
  const params = new URLSearchParams({ format: "json", q: query, limit: "1" });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("Location search failed. Try again.");
  }

  const results = (await response.json()) as Array<{
    lat: string;
    lon: string;
    boundingbox?: [string, string, string, string];
  }>;

  if (results.length === 0) {
    throw new Error("No matching location found.");
  }

  const [first] = results;
  if (!first) {
    throw new Error("No matching location found.");
  }

  return {
    lat: Number(first.lat),
    lng: Number(first.lon),
  };
}

function hideFailedTile(tile: HTMLImageElement | undefined) {
  if (tile) {
    tile.style.visibility = "hidden";
  }
}

function showLoadedTile(tile: HTMLImageElement | undefined) {
  if (tile) {
    tile.style.visibility = "";
  }
}

function parseTileCoordsFromSrc(src: string): { z: number; x: number; y: number } | null {
  const match = src.match(/\/(\d+)\/(\d+)\/(\d+)(?:@2x)?\.png(?:\?|$)/);
  if (!match) {
    return null;
  }

  const z = Number(match[1]);
  const x = Number(match[2]);
  const y = Number(match[3]);
  if (!Number.isFinite(z) || !Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  return { z, x, y };
}

function attachRemoteTileFallback(layer: import("leaflet").TileLayer, style: MapBaseMapStyle) {
  if (style !== "standard") {
    return;
  }

  layer.on("tileerror", (event) => {
    const tile = event.tile as HTMLImageElement | undefined;
    if (!tile) {
      return;
    }

    if (tile.dataset.fallback === "1") {
      hideFailedTile(tile);
      return;
    }

    const coords =
      "coords" in event && event.coords
        ? (event.coords as { z: number; x: number; y: number })
        : parseTileCoordsFromSrc(tile.src);

    if (!coords) {
      hideFailedTile(tile);
      return;
    }

    tile.dataset.fallback = "1";
    tile.src = buildTileUrlFallback("standard", coords.z, coords.x, coords.y);
  });
}

export function createBaseLayer(
  L: typeof import("leaflet"),
  style: MapBaseMapStyle,
  tileUrlOverride?: string | null,
) {
  const config = BASE_MAP_CONFIG[style];
  const layerOptions = {
    maxZoom: config.maxZoom,
    attribution: config.attribution,
    crossOrigin: "anonymous" as const,
  };

  if (!tileUrlOverride) {
    const remote = L.tileLayer(config.url, layerOptions);
    attachRemoteTileFallback(remote, style);
    return remote;
  }

  const remote = L.tileLayer(config.url, layerOptions);
  attachRemoteTileFallback(remote, style);
  const local = L.tileLayer(tileUrlOverride, {
    maxZoom: config.maxZoom,
    attribution: "",
    crossOrigin: "anonymous",
  });

  local.on("tileerror", (event) => {
    hideFailedTile(event.tile as HTMLImageElement | undefined);
  });
  local.on("tileload", (event) => {
    showLoadedTile(event.tile as HTMLImageElement | undefined);
  });

  return L.layerGroup([remote, local]);
}

export function createMapHandle(
  map: import("leaflet").Map,
  options: {
    setSuppressViewportSync: (value: boolean) => void;
    emitViewportChange: () => void;
  },
): MapHandle {
  return {
    async panToQuery(query) {
      try {
        const result = await geocodePlace(query);
        options.setSuppressViewportSync(true);
        map.setView([result.lat, result.lng], Math.max(map.getZoom(), 13));
        options.emitViewportChange();
        options.setSuppressViewportSync(false);
        return {};
      } catch (error) {
        return { error: error instanceof Error ? error.message : "Location search failed." };
      }
    },
    setViewport(viewport) {
      options.setSuppressViewportSync(true);
      map.setView([viewport.latitude, viewport.longitude], viewport.zoom);
      options.emitViewportChange();
      options.setSuppressViewportSync(false);
    },
    captureView: async (overlays, captureOptions) => {
      const previous = {
        latitude: map.getCenter().lat,
        longitude: map.getCenter().lng,
        zoom: map.getZoom(),
      };

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
            [south, west],
            [north, east],
          ],
          { padding: [48, 48], maxZoom: 17, animate: false },
        );
        options.emitViewportChange();
        options.setSuppressViewportSync(false);
      }

      const capture = await captureMapPaneFromDom(map, overlays);

      if (captureOptions?.fitControlPoints) {
        options.setSuppressViewportSync(true);
        map.setView([previous.latitude, previous.longitude], previous.zoom, { animate: false });
        options.emitViewportChange();
        options.setSuppressViewportSync(false);
      }

      return capture;
    },
  };
}
