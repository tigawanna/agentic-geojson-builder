import { geocodePlace } from "@renderer/features/maps/lib/map-handle";
import { parseMapSearchQuery } from "@renderer/features/mapbox-viewer/lib/parse-map-search-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

type MapboxLocationSearchProps = {
  onGoTo: (latitude: number, longitude: number) => void;
  onError: (message: string) => void;
};

export function MapboxLocationSearch({ onGoTo, onError }: MapboxLocationSearchProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    const coordinates = parseMapSearchQuery(trimmed);
    if (coordinates) {
      onGoTo(coordinates.latitude, coordinates.longitude);
      return;
    }

    setSearching(true);
    try {
      const result = await geocodePlace(trimmed);
      onGoTo(result.lat, result.lng);
    } catch (error: unknown) {
      onError(error instanceof Error ? error.message : t("mapboxViewer.searchFailed"));
    } finally {
      setSearching(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="pointer-events-auto flex max-w-md min-w-0 flex-1 items-center gap-1 rounded-2xl border border-base-300 bg-base-100/95 py-1 pr-1 pl-3 shadow-lg backdrop-blur-sm"
      data-test="mapbox-location-search"
    >
      <Search className="size-4 shrink-0 text-base-content/50" />
      <input
        type="search"
        className="input input-sm min-w-0 flex-1 border-0 bg-transparent px-1 focus:outline-none"
        placeholder={t("mapboxViewer.searchPlaceholder")}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        disabled={searching}
      />
      <button type="submit" className="btn shrink-0 btn-sm btn-primary" disabled={searching}>
        {searching ? t("mapboxViewer.searching") : t("mapboxViewer.searchGo")}
      </button>
    </form>
  );
}
