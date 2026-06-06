import { useMemo } from "react";
import { Network, RefreshCw, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@renderer/lib/utils";
import { segmentGroupColor } from "@renderer/features/maps/lib/segment-utils";
import type { VirtualPathPreview } from "@renderer/features/maps/lib/virtual-graph-preview.types";
import {
  useMapWorkspaceUiActions,
  useMapWorkspaceUiState,
} from "@renderer/features/maps/store/MapWorkspaceProvider";
import type { MapPathGroupSummary } from "@renderer/features/maps/types/map-data-explorer.types";

type MapGraphPreviewPanelProps = {
  pathGroups: MapPathGroupSummary[];
  previews: Map<string, VirtualPathPreview>;
  loading: boolean;
  error: string | null;
  onReload: () => void;
  onClose: () => void;
};

export function MapGraphPreviewPanel({
  pathGroups,
  previews,
  loading,
  error,
  onReload,
  onClose,
}: MapGraphPreviewPanelProps) {
  const { t } = useTranslation();
  const graphPreviewVisibleSlugs = useMapWorkspaceUiState(
    (state) => state.graphPreviewVisibleSlugs,
  );
  const { toggleGraphPreviewSlug, setGraphPreviewVisibleSlugs } = useMapWorkspaceUiActions();

  const pathSlugs = useMemo(() => pathGroups.map((group) => group.groupId), [pathGroups]);
  const visibleSlugSet = useMemo(
    () => new Set(graphPreviewVisibleSlugs),
    [graphPreviewVisibleSlugs],
  );

  const totals = useMemo(() => {
    let visibleEdges = 0;
    let totalEdges = 0;
    for (const group of pathGroups) {
      const preview = previews.get(group.groupId);
      const count = preview?.edgeCount ?? 0;
      totalEdges += count;
      if (visibleSlugSet.has(group.groupId)) {
        visibleEdges += count;
      }
    }
    return { visibleEdges, totalEdges };
  }, [pathGroups, previews, visibleSlugSet]);

  return (
    <aside
      className="flex h-full min-h-0 flex-col border-l border-base-300 bg-base-100"
      data-test="graph-preview-panel"
    >
      <header className="flex items-center justify-between border-b border-base-300 px-4 py-3">
        <div className="flex items-center gap-2">
          <Network className="size-4 text-secondary" />
          <h2 className="text-sm font-semibold">{t("maps.workspace.graphPreview.title")}</h2>
        </div>
        <button
          type="button"
          className="btn btn-square btn-ghost btn-xs"
          aria-label={t("shortcuts.close")}
          onClick={onClose}
        >
          <X className="size-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <p className="rounded-box bg-secondary/10 px-3 py-2 text-xs text-base-content/75">
          {t("maps.workspace.graphPreview.hint")}
        </p>

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-base-content/60">
            {loading
              ? t("maps.workspace.graphPreview.loading")
              : t("maps.workspace.graphPreview.stats", totals)}
          </p>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            disabled={loading}
            onClick={onReload}
          >
            <RefreshCw className={cn("size-3.5", loading ? "animate-spin" : "")} />
            {t("maps.workspace.graphPreview.refresh")}
          </button>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-outline btn-xs"
            disabled={pathSlugs.length === 0}
            onClick={() => setGraphPreviewVisibleSlugs(pathSlugs)}
          >
            {t("maps.workspace.graphPreview.showAll")}
          </button>
          <button
            type="button"
            className="btn btn-outline btn-xs"
            disabled={graphPreviewVisibleSlugs.length === 0}
            onClick={() => setGraphPreviewVisibleSlugs([])}
          >
            {t("maps.workspace.graphPreview.hideAll")}
          </button>
        </div>

        {error ? <p className="text-xs text-error">{error}</p> : null}

        {pathGroups.length === 0 ? (
          <p className="text-xs text-base-content/55">{t("maps.workspace.graphPreview.noPaths")}</p>
        ) : (
          <ul className="space-y-1">
            {pathGroups.map((group) => {
              const preview = previews.get(group.groupId);
              const checked = visibleSlugSet.has(group.groupId);
              const skippedCount = preview?.skippedMarkers.length ?? 0;

              return (
                <li key={group.groupId}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md border px-2 py-2 transition-colors",
                      checked
                        ? "border-secondary/30 bg-secondary/10"
                        : "border-base-content/10 bg-base-100/40 opacity-70",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="checkbox checkbox-xs checkbox-secondary"
                      checked={checked}
                      onChange={() => toggleGraphPreviewSlug(group.groupId)}
                    />
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: segmentGroupColor(group.groupId) }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-xs font-semibold">
                        {group.name ?? group.groupId}
                      </span>
                      <span className="block truncate font-mono text-[10px] text-base-content/45">
                        {group.groupId}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] text-base-content/50 tabular-nums">
                      {preview
                        ? t("maps.workspace.graphPreview.edgeCount", {
                            count: preview.edgeCount,
                          })
                        : "—"}
                    </span>
                  </label>
                  {checked && skippedCount > 0 ? (
                    <p className="mt-1 pl-8 text-[10px] text-warning">
                      {t("maps.workspace.graphPreview.skipped", { count: skippedCount })}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
