import { Crosshair, Layers, Route } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@renderer/lib/utils";
import { useMapBaseRendererQuery } from "@renderer/features/maps/hooks/useMapBaseRenderer";
import { useReferenceGeoJsonQuery } from "@renderer/features/maps/hooks/useReferenceGeoJsonQuery";
import { useMapDataExplorerPageStore } from "@renderer/features/maps/store/map-data-explorer-page-store";

type MapDataExplorerMapToolbarProps = {
  mapId: number;
};

export function MapDataExplorerMapToolbar({ mapId }: MapDataExplorerMapToolbarProps) {
  const { t } = useTranslation();
  const baseRenderer = useMapBaseRendererQuery().data ?? "leaflet";
  const referenceGeoJsonQuery = useReferenceGeoJsonQuery(mapId);
  const hasReferenceGeoJson = (referenceGeoJsonQuery.data?.layers.length ?? 0) > 0;

  const showReferenceOverlay = useMapDataExplorerPageStore((state) => state.showReferenceOverlay);
  const showReferenceInspectTooltip = useMapDataExplorerPageStore(
    (state) => state.showReferenceInspectTooltip,
  );
  const mapboxInspectMode = useMapDataExplorerPageStore((state) => state.mapboxInspectMode);
  const setShowReferenceOverlay = useMapDataExplorerPageStore(
    (state) => state.setShowReferenceOverlay,
  );
  const setShowReferenceInspectTooltip = useMapDataExplorerPageStore(
    (state) => state.setShowReferenceInspectTooltip,
  );
  const toggleMapboxInspectMode = useMapDataExplorerPageStore(
    (state) => state.toggleMapboxInspectMode,
  );

  const toggleClass = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
      active
        ? "bg-primary text-primary-content shadow-sm"
        : "bg-base-100/90 text-base-content/70 hover:bg-base-100 hover:text-base-content",
    );

  return (
    <div
      className="pointer-events-auto absolute top-2 left-2 z-10 flex max-w-[calc(100%-1rem)] flex-wrap gap-1"
      data-test="data-explorer-map-toolbar"
    >
      {hasReferenceGeoJson ? (
        <button
          type="button"
          className={toggleClass(showReferenceOverlay)}
          onClick={() => setShowReferenceOverlay(!showReferenceOverlay)}
          title={t("maps.workspace.quickMenu.referenceOverlay")}
        >
          <Layers className="size-3" />
          {t("maps.workspace.dataExplorer.inspect.trails")}
        </button>
      ) : null}
      <button
        type="button"
        className={toggleClass(showReferenceInspectTooltip)}
        onClick={() => setShowReferenceInspectTooltip(!showReferenceInspectTooltip)}
        title={t("maps.workspace.dataExplorer.inspect.trailHoverHint")}
      >
        <Route className="size-3" />
        {t("maps.workspace.dataExplorer.inspect.trailHover")}
      </button>
      {baseRenderer === "mapbox-gl" ? (
        <button
          type="button"
          className={toggleClass(mapboxInspectMode)}
          onClick={toggleMapboxInspectMode}
          title={t("mapboxViewer.inspectModeHint")}
        >
          <Crosshair className="size-3" />
          {t("mapboxViewer.inspectMode")}
        </button>
      ) : null}
    </div>
  );
}
