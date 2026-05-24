import {
  type MapBaseMapStyle,
  type MapViewport,
} from "@/data-access-layer/pglite/maps-query-options";
import { unwrapUnknownError } from "@/utils/errors";
import { toast } from "sonner";
import type * as Leaflet from "leaflet";

export type MapHandle = {
  panToQuery: (query: string) => Promise<{ error?: string }>;
  setViewport: (viewport: MapViewport) => void;
};

export type BaseMapStyle = MapBaseMapStyle;

export type BaseMapConfig = {
  url: string;
  attribution: string;
  maxZoom: number;
};

export const DEFAULT_MAP_VIEWPORT: MapViewport = {
  latitude: -1.286389,
  longitude: 36.817223,
  zoom: 13,
};

export const BASE_MAP_CONFIG: Record<BaseMapStyle, BaseMapConfig> = {
  outline: {
    url: "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
  },
  standard: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    maxZoom: 19,
  },
};

type GeocodeResult = {
  lat: number;
  lng: number;
  bounds?: [[number, number], [number, number]];
};

export async function geocodePlace(query: string): Promise<GeocodeResult> {
  const params = new URLSearchParams({
    format: "json",
    q: query,
    limit: "1",
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: {
      Accept: "application/json",
    },
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
  const lat = Number(first.lat);
  const lng = Number(first.lon);
  let bounds: [[number, number], [number, number]] | undefined;

  if (first.boundingbox) {
    const [south, north, west, east] = first.boundingbox;
    bounds = [
      [Number(south), Number(west)],
      [Number(north), Number(east)],
    ];
  }

  return { lat, lng, bounds };
}

export function formatMapCoordinates(latitude: number, longitude: number) {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

export async function copyMapCoordinates(latitude: number, longitude: number) {
  const text = formatMapCoordinates(latitude, longitude);
  await navigator.clipboard.writeText(text);
  toast.success("Coordinates copied", { description: text });
}

export function createBaseLayer(L: typeof Leaflet, style: BaseMapStyle) {
  const config = BASE_MAP_CONFIG[style];
  return L.tileLayer(config.url, {
    maxZoom: config.maxZoom,
    attribution: config.attribution,
  });
}

type CreateMapHandleOptions = {
  setSuppressViewportSync: (value: boolean) => void;
  emitViewportChange: () => void;
};

export function createMapHandle(map: Leaflet.Map, options: CreateMapHandleOptions): MapHandle {
  const { setSuppressViewportSync, emitViewportChange } = options;

  return {
    panToQuery: async (query) => {
      try {
        const result = await geocodePlace(query);

        setSuppressViewportSync(true);
        if (result.bounds) {
          map.fitBounds(result.bounds, { padding: [48, 48] });
        } else {
          map.flyTo([result.lat, result.lng], 14);
        }
        window.setTimeout(() => {
          setSuppressViewportSync(false);
          emitViewportChange();
        }, 300);

        return {};
      } catch (err: unknown) {
        return { error: unwrapUnknownError(err).message };
      }
    },
    setViewport: (viewport) => {
      setSuppressViewportSync(true);
      map.setView([viewport.latitude, viewport.longitude], viewport.zoom, { animate: false });
      setSuppressViewportSync(false);
    },
  };
}
