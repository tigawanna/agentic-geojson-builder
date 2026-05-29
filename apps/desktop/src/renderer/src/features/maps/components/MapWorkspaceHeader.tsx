import { Link } from "@tanstack/react-router";
import { ArrowLeft, Download, Eye, History, Pencil, RotateCw, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatMapCoordinates } from "@renderer/features/maps/lib/copy-map-coordinates";
import {
  useMapWorkspaceUiActions,
  useMapWorkspaceUiState,
  useMapWorkspaceState,
} from "@renderer/features/maps/store/MapWorkspaceProvider";

type MapWorkspaceHeaderProps = {
  onOpenControls: () => void;
  onOpenAuditLog: () => void;
  onPreviewGeoJson: () => void;
  hasSourceFile: boolean;
  segmentCount: number;
  exportDisabled: boolean;
  exportPending: boolean;
  onExportGeoJson: () => void;
};

async function hardReloadView() {
  await window.api.invoke("app:hardReload", undefined);
}

export function MapWorkspaceHeader({
  onOpenControls,
  onOpenAuditLog,
  onPreviewGeoJson,
  hasSourceFile,
  segmentCount,
  exportDisabled,
  exportPending,
  onExportGeoJson,
}: MapWorkspaceHeaderProps) {
  const { t } = useTranslation();
  const workspace = useMapWorkspaceState((state) => state.workspace);
  const cursorCoordinates = useMapWorkspaceUiState((state) => state.cursorCoordinates);
  const selectedCoordinates = useMapWorkspaceUiState((state) => state.selectedCoordinates);
  const statusMessage = useMapWorkspaceUiState((state) => state.statusMessage);
  const referenceMode = useMapWorkspaceUiState((state) => state.referenceMode);
  const traceMode = useMapWorkspaceUiState((state) => state.traceMode);
  const pendingMapPoint = useMapWorkspaceUiState((state) => state.pendingMapPoint);
  const {
    setReferenceMode,
    stopReferenceMode,
    setTraceMode,
    stopTraceMode,
    setPendingMapPoint,
    setStatusMessage,
  } = useMapWorkspaceUiActions();

  if (!workspace) {
    return null;
  }

  const coordinateLine = selectedCoordinates
    ? formatMapCoordinates(selectedCoordinates.latitude, selectedCoordinates.longitude)
    : cursorCoordinates
      ? formatMapCoordinates(cursorCoordinates.latitude, cursorCoordinates.longitude)
      : null;

  return (
    <header className="relative z-20 flex items-center gap-3 border-b border-base-content/10 px-3 py-2">
      <Link
        to="/maps"
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-base-content/60 transition-colors hover:bg-base-content/10 hover:text-base-content"
        aria-label={t("maps.workspace.back")}
      >
        <ArrowLeft className="size-4" />
      </Link>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <h1 className="min-w-0 truncate text-sm font-semibold">{workspace.name}</h1>
        {coordinateLine ? (
          <span className="hidden shrink-0 font-mono text-xs text-base-content/40 lg:inline">
            {coordinateLine}
          </span>
        ) : null}
        {statusMessage || (referenceMode && !pendingMapPoint) ? (
          <span className="shrink-0 text-xs text-success">
            {statusMessage ??
              (referenceMode && !pendingMapPoint ? t("maps.workspace.referenceHint") : "")}
          </span>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40 ${
            referenceMode
              ? "bg-primary text-primary-content"
              : "text-base-content/65 hover:bg-base-content/8 hover:text-base-content"
          }`}
          disabled={!hasSourceFile || traceMode}
          onClick={() => {
            if (referenceMode) {
              stopReferenceMode();
              setStatusMessage(null);
              return;
            }
            stopTraceMode();
            setReferenceMode(true);
            setPendingMapPoint(null);
          }}
        >
          {t("maps.workspace.addReference")}
        </button>

        <button
          type="button"
          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40 ${
            traceMode
              ? "bg-secondary text-secondary-content"
              : "text-base-content/65 hover:bg-base-content/8 hover:text-base-content"
          }`}
          disabled={referenceMode}
          onClick={() => {
            if (traceMode) {
              stopTraceMode();
              setStatusMessage(null);
              return;
            }
            stopReferenceMode();
            setTraceMode(true);
          }}
          data-test="trace-mode-toggle"
        >
          <Pencil className="size-3" />
          {t("maps.workspace.traceTrail")}
        </button>

        <div className="mx-1 h-4 w-px bg-base-content/10" />

        <button
          type="button"
          className="inline-flex size-7 items-center justify-center rounded-md text-base-content/50 transition-colors hover:bg-base-content/8 hover:text-base-content disabled:opacity-40"
          disabled={segmentCount === 0}
          onClick={onPreviewGeoJson}
          title="Preview GeoJSON"
        >
          <Eye className="size-3.5" />
        </button>

        <button
          type="button"
          className="inline-flex size-7 items-center justify-center rounded-md text-base-content/50 transition-colors hover:bg-base-content/8 hover:text-base-content disabled:opacity-40"
          disabled={exportDisabled || exportPending || segmentCount === 0}
          onClick={onExportGeoJson}
          title={`Export GeoJSON (${segmentCount})`}
          data-test="export-geojson"
        >
          <Download className="size-3.5" />
        </button>

        {segmentCount > 0 ? (
          <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            {segmentCount}
          </span>
        ) : null}

        <div className="mx-1 h-4 w-px bg-base-content/10" />

        <button
          type="button"
          className="btn gap-1.5 btn-sm btn-primary"
          onClick={onOpenControls}
          title={t("maps.workspace.openControlsShortcut")}
          data-test="open-controls"
        >
          <Settings2 className="size-3.5" />
          {t("maps.workspace.controls")}
          <kbd className="kbd border-primary-content/25 bg-primary-content/15 kbd-xs text-primary-content">
            {t("maps.workspace.controlsShortcut")}
          </kbd>
        </button>

        <button
          type="button"
          className="inline-flex size-7 items-center justify-center rounded-md text-base-content/50 transition-colors hover:bg-base-content/8 hover:text-base-content"
          onClick={onOpenAuditLog}
          title="Change history"
        >
          <History className="size-3.5" />
        </button>

        <button
          type="button"
          className="inline-flex size-7 items-center justify-center rounded-md text-base-content/50 transition-colors hover:bg-base-content/8 hover:text-base-content"
          onClick={() => void hardReloadView()}
          title={t("maps.workspace.hardReloadHint")}
          data-test="map-hard-reload"
        >
          <RotateCw className="size-3.5" />
        </button>
      </div>
    </header>
  );
}
