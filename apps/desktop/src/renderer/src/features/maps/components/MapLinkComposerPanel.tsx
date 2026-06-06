import { useMemo, useState } from "react";
import { Link2, MapPinPlus, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@renderer/lib/utils";
import { useIpcMutation } from "@renderer/hooks/useIpc";
import { groupSegmentsByPath } from "@renderer/features/maps/lib/group-segments-by-path";
import { listComposerMarkers } from "@renderer/features/maps/lib/list-composer-markers";
import { filterMapPointsBySearch } from "@renderer/features/maps/lib/map-points-list-filter";
import {
  useMapWorkspaceUiActions,
  useMapWorkspaceUiState,
} from "@renderer/features/maps/store/MapWorkspaceProvider";
import { suggestLinkChainMarkers } from "@renderer/features/maps/lib/suggest-link-chain-markers";
import { MapLinkComposerChainList } from "@renderer/features/maps/components/MapLinkComposerChainList";
import { MapLinkComposerMarkerRow } from "@renderer/features/maps/components/MapLinkComposerMarkerRow";
import { SegmentBuildFromPathPanel } from "@renderer/features/maps/components/SegmentBuildFromPathPanel";
import type { GeoSegmentRecord } from "@shared/geo-segments.types";
import type { MapLinkRecord } from "@shared/map-links.types";
import type { MarkerNeighborRecord } from "@shared/marker-neighbors.types";
import type { MapPointRecord } from "@shared/map-points.types";

type MapLinkComposerPanelProps = {
  mapId: number;
  mapPoints: MapPointRecord[];
  markerNeighbors: MarkerNeighborRecord[];
  geoSegments: GeoSegmentRecord[];
  mapLinks: MapLinkRecord[];
  linkChain: number[];
  onAppendToChain: (pointId: number) => void;
  onRemoveFromChain: (index: number) => void;
  onReorderChain: (fromIndex: number, toIndex: number) => void;
  onClearChain: () => void;
  onClose?: () => void;
  onStatusMessage?: (message: string | null) => void;
  embedded?: boolean;
};

export function MapLinkComposerPanel({
  mapId,
  mapPoints,
  markerNeighbors,
  geoSegments,
  mapLinks,
  linkChain,
  onAppendToChain,
  onRemoveFromChain,
  onReorderChain,
  onClearChain,
  onClose,
  onStatusMessage,
  embedded = false,
}: MapLinkComposerPanelProps) {
  const { t } = useTranslation();
  const pathGroups = groupSegmentsByPath(geoSegments);
  const createChain = useIpcMutation("segments:createChainFromPoints");
  const addMarkerPlacementMode = useMapWorkspaceUiState((state) => state.addMarkerPlacementMode);
  const workspaceUiActions = useMapWorkspaceUiActions();
  const [message, setMessage] = useState<string | null>(null);
  const [markerSearchQuery, setMarkerSearchQuery] = useState("");
  const [autoBuildOpen, setAutoBuildOpen] = useState(false);
  const [segmentGroupLabel, setSegmentGroupLabel] = useState("manual-segments");

  const searchableMapPoints = useMemo(
    () => filterMapPointsBySearch(mapPoints, markerSearchQuery),
    [mapPoints, markerSearchQuery],
  );

  const markerRows = useMemo(
    () =>
      listComposerMarkers({
        mapPoints: searchableMapPoints,
        chainPointIds: linkChain,
        mapLinks,
        markerNeighbors,
      }),
    [linkChain, mapLinks, markerNeighbors, searchableMapPoints],
  );

  const suggestions = useMemo(
    () =>
      suggestLinkChainMarkers({
        mapPoints,
        chainPointIds: linkChain,
        markerNeighbors,
      }),
    [linkChain, mapPoints, markerNeighbors],
  );

  const pointsById = useMemo(
    () => new Map(mapPoints.map((point) => [point.id, point])),
    [mapPoints],
  );

  function reportStatus(text: string | null) {
    setMessage(text);
    onStatusMessage?.(text);
  }

  async function handleSaveSegments() {
    if (linkChain.length < 2) {
      reportStatus(t("maps.workspace.linkComposer.needTwoMarkers"));
      return;
    }
    reportStatus(null);
    try {
      const result = await createChain.mutateAsync({
        mapId,
        pointIds: linkChain,
        pathSlug: segmentGroupLabel.trim() || "manual-segments",
      });
      reportStatus(
        t("maps.workspace.linkComposer.chainCreated", { count: result.segments.length }),
      );
      onClearChain();
    } catch (caught: unknown) {
      reportStatus(caught instanceof Error ? caught.message : String(caught));
    }
  }

  const shellClass = embedded
    ? "space-y-4"
    : "flex h-full min-h-0 flex-col border-l border-base-300 bg-base-100";

  return (
    <aside className={shellClass} data-test="link-composer-panel">
      {!embedded ? (
        <header className="flex items-center justify-between border-b border-base-300 px-4 py-3">
          <div className="flex items-center gap-2">
            <Link2 className="size-4 text-info" />
            <h2 className="text-sm font-semibold">{t("maps.workspace.linkComposer.title")}</h2>
          </div>
          {onClose ? (
            <button
              type="button"
              className="btn btn-square btn-ghost btn-xs"
              aria-label={t("shortcuts.close")}
              onClick={onClose}
            >
              <X className="size-4" />
            </button>
          ) : null}
        </header>
      ) : (
        <div className="space-y-1">
          <p className="text-sm font-semibold">{t("maps.workspace.linkComposer.title")}</p>
          <p className="text-xs text-base-content/60">{t("maps.workspace.linkComposer.hint")}</p>
        </div>
      )}

      <div className={cn("min-h-0 flex-1 space-y-4 overflow-y-auto", embedded ? "" : "p-4")}>
        <p className="rounded-box bg-info/10 px-3 py-2 text-xs text-base-content/75">
          {t("maps.workspace.linkComposer.mapHint")}
        </p>

        <div className="space-y-2">
          <p className="text-xs font-medium tracking-wide text-base-content/50 uppercase">
            {t("maps.workspace.linkComposer.savedSegments")}
          </p>
          {mapLinks.length === 0 ? (
            <p className="text-xs text-base-content/55">
              {t("maps.workspace.linkComposer.noSavedSegments")}
            </p>
          ) : (
            <ul className="max-h-28 space-y-1 overflow-y-auto rounded-box bg-base-200/40 p-2 text-xs">
              {mapLinks.map((link) => (
                <li key={link.id} className="flex items-center gap-2 font-mono">
                  <span className="size-1.5 shrink-0 rounded-full bg-success" />
                  <span>
                    {link.fromRef} → {link.toRef}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium tracking-wide text-base-content/50 uppercase">
              {t("maps.workspace.linkComposer.chain")}
            </p>
            {linkChain.length > 0 ? (
              <button type="button" className="btn btn-ghost btn-xs" onClick={onClearChain}>
                {t("maps.workspace.linkComposer.clearChain")}
              </button>
            ) : null}
          </div>
          <MapLinkComposerChainList
            linkChain={linkChain}
            mapPoints={mapPoints}
            onRemoveFromChain={onRemoveFromChain}
            onReorderChain={onReorderChain}
          />
          <label className="form-control gap-1">
            <span className="label-text text-xs">
              {t("maps.workspace.linkComposer.segmentGroupLabel")}
            </span>
            <input
              className="input-bordered input input-sm w-full font-mono"
              value={segmentGroupLabel}
              onChange={(event) => setSegmentGroupLabel(event.target.value)}
              placeholder="manual-segments"
            />
          </label>
          <button
            type="button"
            className="btn w-full btn-sm btn-primary"
            disabled={linkChain.length < 2 || createChain.isPending}
            onClick={() => void handleSaveSegments()}
            data-test="link-composer-save"
          >
            {t("maps.workspace.linkComposer.saveSegments")}
          </button>
        </div>

        {linkChain.length > 0 && suggestions.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-base-content/50 uppercase">
              {t("maps.workspace.linkComposer.nextMarkers")}
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.pointId}
                  type="button"
                  className={cn(
                    "btn font-mono btn-xs",
                    suggestion.reason === "hint"
                      ? "btn-primary"
                      : suggestion.reason === "points-here"
                        ? "btn-secondary"
                        : "btn-outline",
                  )}
                  onClick={() => onAppendToChain(suggestion.pointId)}
                  data-test={`link-suggestion-${suggestion.ref}`}
                >
                  {suggestion.ref}
                  {suggestion.hintLabel ? (
                    <span className="text-[10px] opacity-80">{suggestion.hintLabel}</span>
                  ) : null}
                  <span className="text-[10px] text-base-content/45">
                    {Math.round(suggestion.distanceMeters)} m
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium tracking-wide text-base-content/50 uppercase">
              {markerSearchQuery.trim()
                ? t("maps.workspace.linkComposer.searchResults")
                : linkChain.length > 0
                  ? t("maps.workspace.linkComposer.markersNearHead")
                  : t("maps.workspace.linkComposer.allMarkers")}
            </p>
            {!embedded ? (
              <button
                type="button"
                className={
                  addMarkerPlacementMode ? "btn btn-xs btn-primary" : "btn btn-outline btn-xs"
                }
                onClick={() => {
                  if (addMarkerPlacementMode) {
                    workspaceUiActions.stopAddMarkerPlacementMode();
                    workspaceUiActions.setStatusMessage(null);
                    return;
                  }
                  workspaceUiActions.setAddMarkerPlacementMode(true);
                  workspaceUiActions.setStatusMessage(t("maps.workspace.addMarkerPlacementHint"));
                }}
                data-test="link-composer-add-marker"
              >
                <MapPinPlus className="size-3.5" />
                {t("maps.workspace.addNewMarker")}
              </button>
            ) : null}
          </div>
          <label className="input-bordered input input-xs flex w-full items-center gap-2">
            <Search className="size-3 shrink-0 text-base-content/45" />
            <input
              className="grow bg-transparent text-xs outline-none"
              value={markerSearchQuery}
              onChange={(event) => setMarkerSearchQuery(event.target.value)}
              placeholder={t("maps.workspace.linkComposer.searchPlaceholder")}
            />
          </label>
          {markerRows.length === 0 ? (
            <p className="text-xs text-base-content/55">
              {t("maps.workspace.linkComposer.noMarkers")}
            </p>
          ) : (
            <ul className="max-h-64 space-y-1 overflow-y-auto">
              {markerRows.map((row) => {
                const point = pointsById.get(row.pointId);
                if (!point) {
                  return null;
                }
                return (
                  <MapLinkComposerMarkerRow
                    key={row.pointId}
                    mapId={mapId}
                    point={point}
                    row={row}
                    onAppendToChain={(pointId) => {
                      if (markerSearchQuery.trim()) {
                        setMarkerSearchQuery("");
                      }
                      onAppendToChain(pointId);
                    }}
                  />
                );
              })}
            </ul>
          )}
        </div>

        {message ? <p className="text-xs text-base-content/70">{message}</p> : null}

        {pathGroups.length > 0 ? (
          <details
            className="rounded-box border border-base-content/10 p-3"
            open={autoBuildOpen}
            onToggle={(event) => setAutoBuildOpen(event.currentTarget.open)}
          >
            <summary className="cursor-pointer text-xs font-medium text-base-content/70">
              {t("maps.workspace.linkComposer.autoBuild")}
            </summary>
            <div className="mt-3">
              <SegmentBuildFromPathPanel
                mapId={mapId}
                geoSegments={geoSegments}
                showPathSelect
                onStatusMessage={reportStatus}
              />
            </div>
          </details>
        ) : null}
      </div>
    </aside>
  );
}

export function resolveLinkComposerSuggestionPointIds(input: {
  mapPoints: MapPointRecord[];
  chainPointIds: number[];
  markerNeighbors?: MarkerNeighborRecord[];
}): number[] {
  return suggestLinkChainMarkers({
    mapPoints: input.mapPoints,
    chainPointIds: input.chainPointIds,
    markerNeighbors: input.markerNeighbors,
  }).map((entry) => entry.pointId);
}
