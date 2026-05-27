import type { MapBaseMapStyle } from "@shared/maps.types";

export type MapViewport = {
  latitude: number;
  longitude: number;
  zoom: number;
};

export type MapHandle = {
  panToQuery: (query: string) => Promise<{ error?: string }>;
  setViewport: (viewport: MapViewport) => void;
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
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
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

export function createBaseLayer(L: typeof import("leaflet"), style: MapBaseMapStyle) {
  const config = BASE_MAP_CONFIG[style];
  return L.tileLayer(config.url, {
    maxZoom: config.maxZoom,
    attribution: config.attribution,
  });
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
  };
}
