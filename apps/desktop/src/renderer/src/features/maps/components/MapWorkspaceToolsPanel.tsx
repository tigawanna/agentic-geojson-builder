import { Link } from "@tanstack/react-router";
import {
  Database,
  Download,
  Eye,
  FileOutput,
  HelpCircle,
  History,
  RotateCw,
  Settings2,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { MapTraceTrailBar } from "@renderer/features/maps/components/MapTraceTrailBar";
import { MapWorkspaceViewOptionsSection } from "@renderer/features/maps/components/MapWorkspaceViewOptionsSection";
import { useMapBaseRendererQuery } from "@renderer/features/maps/hooks/useMapBaseRenderer";
import {
  useMapWorkspaceState,
  useMapWorkspaceUiActions,
  useMapWorkspaceUiState,
} from "@renderer/features/maps/store/MapWorkspaceProvider";

type MapWorkspaceToolsPanelProps = {
  segmentCount: number;
  exportDisabled: boolean;
  exportPending: boolean;
  onPreviewGeoJson: () => void;
  onExportGeoJson: () => void;
  onOpenControls: () => void;
  onOpenAuditLog: () => void;
  mapId: number;
  onOpenGuide: () => void;
  onHardReload: () => void;
  onTraceFinish: () => void;
  onTraceUndo: () => void;
  traceFinishDisabled: boolean;
  traceFinishPending: boolean;
};

export function MapWorkspaceToolsPanel({
  segmentCount,
  exportDisabled,
  exportPending,
  onPreviewGeoJson,
  onExportGeoJson,
  onOpenControls,
  onOpenAuditLog,
  mapId,
  onOpenGuide,
  onHardReload,
  onTraceFinish,
  onTraceUndo,
  traceFinishDisabled,
  traceFinishPending,
}: MapWorkspaceToolsPanelProps) {
  const { t } = useTranslation();
  const workspace = useMapWorkspaceState((state) => state.workspace);
  const baseRenderer = useMapBaseRendererQuery().data ?? "leaflet";
  const toolsPanelOpen = useMapWorkspaceUiState((state) => state.toolsPanelOpen);
  const traceMode = useMapWorkspaceUiState((state) => state.traceMode);
  const statusMessage = useMapWorkspaceUiState((state) => state.statusMessage);
  const referenceMode = useMapWorkspaceUiState((state) => state.referenceMode);
  const { closeToolsPanel } = useMapWorkspaceUiActions();

  if (!workspace || !toolsPanelOpen) {
    return null;
  }

  return (
    <aside
      className="pointer-events-auto absolute inset-y-0 right-0 z-1080 flex w-72 flex-col border-l border-base-content/10 bg-base-100/98 shadow-xl backdrop-blur-sm"
      data-test="workspace-tools-panel"
    >
      <div className="flex items-center justify-between border-b border-base-content/10 px-3 py-2">
        <h2 className="text-sm font-semibold">{t("maps.workspace.toolsPanel.title")}</h2>
        <button
          type="button"
          className="inline-flex size-7 items-center justify-center rounded-md text-base-content/50 hover:bg-base-content/10 hover:text-base-content"
          onClick={closeToolsPanel}
          aria-label={t("maps.workspace.toolsPanel.close")}
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {statusMessage || (referenceMode && !traceMode) ? (
          <p className="mb-3 rounded-md bg-success/10 px-2.5 py-2 text-xs text-success">
            {statusMessage ?? t("maps.workspace.referenceHint")}
          </p>
        ) : null}

        {traceMode ? (
          <div className="mb-4 rounded-lg border border-secondary/25 bg-secondary/5 p-2">
            <MapTraceTrailBar
              onFinish={onTraceFinish}
              onUndo={onTraceUndo}
              finishDisabled={traceFinishDisabled}
              finishPending={traceFinishPending}
            />
          </div>
        ) : null}

        <MapWorkspaceViewOptionsSection />

        <section className="mt-4 space-y-2">
          <h3 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
            {t("maps.workspace.toolsPanel.exportHeading")}
          </h3>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-base-content/5 disabled:opacity-40"
              disabled={segmentCount === 0}
              onClick={onPreviewGeoJson}
            >
              <Eye className="size-3.5" />
              {t("maps.workspace.toolsPanel.previewGeoJson")}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-base-content/5 disabled:opacity-40"
              disabled={exportDisabled || exportPending || segmentCount === 0}
              onClick={onExportGeoJson}
              data-test="export-geojson"
            >
              <Download className="size-3.5" />
              {t("maps.workspace.toolsPanel.exportGeoJson")}
              {segmentCount > 0 ? (
                <span className="ml-auto rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">
                  {segmentCount}
                </span>
              ) : null}
            </button>
            <Link
              to="/maps/$mapId/export"
              params={{ mapId: String(workspace.id) }}
              className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-base-content/5"
              data-test="open-export-page"
            >
              <FileOutput className="size-3.5" />
              {t("maps.workspace.openExport")}
            </Link>
          </div>
        </section>
      </div>

      <div className="flex flex-col gap-1 border-t border-base-content/10 p-2">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-base-content/5"
          onClick={onOpenControls}
          data-test="open-controls"
        >
          <Settings2 className="size-3.5" />
          {t("maps.workspace.controls")}
        </button>
        <Link
          to="/data/$mapId"
          params={{ mapId: String(mapId) }}
          className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-base-content/5"
          data-test="open-data-explorer"
        >
          <Database className="size-3.5" />
          {t("maps.workspace.dataExplorer.open")}
        </Link>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-base-content/5"
          onClick={onOpenAuditLog}
          data-test="open-audit-log"
        >
          <History className="size-3.5" />
          {t("maps.workspace.history")}
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-base-content/5"
          onClick={onOpenGuide}
          data-test="workspace-guide"
        >
          <HelpCircle className="size-3.5" />
          {t("maps.workspace.showGuide")}
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-base-content/5"
          onClick={onHardReload}
          data-test="map-hard-reload"
        >
          <RotateCw className="size-3.5" />
          {t("maps.workspace.hardReload")}
        </button>
      </div>
    </aside>
  );
}
