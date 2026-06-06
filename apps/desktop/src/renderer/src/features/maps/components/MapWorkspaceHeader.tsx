import { Link } from "@tanstack/react-router";
import { ArrowLeft, Link2, MapPin, Network, PanelRightOpen, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DashboardSidebarTrigger } from "@renderer/components/sidebar/DashboardSidebar";
import { useSidebar } from "@renderer/components/sidebar/SidebarProvider";
import { formatMapCoordinates } from "@renderer/features/maps/lib/copy-map-coordinates";
import {
  useMapWorkspaceUiActions,
  useMapWorkspaceUiState,
  useMapWorkspaceState,
} from "@renderer/features/maps/store/MapWorkspaceProvider";

type MapWorkspaceHeaderProps = {
  hasSourceFile: boolean;
  onToggleGraphPreview?: () => void;
};

const toolButtonClass =
  "inline-flex size-8 items-center justify-center rounded-md transition-colors disabled:opacity-40";

function inactiveToolClass() {
  return `${toolButtonClass} text-base-content/55 hover:bg-base-content/8 hover:text-base-content`;
}

export function MapWorkspaceHeader({
  hasSourceFile,
  onToggleGraphPreview,
}: MapWorkspaceHeaderProps) {
  const { t } = useTranslation();
  const { toggleSidebar, isCollapsed } = useSidebar();
  const workspace = useMapWorkspaceState((state) => state.workspace);
  const cursorCoordinates = useMapWorkspaceUiState((state) => state.cursorCoordinates);
  const selectedCoordinates = useMapWorkspaceUiState((state) => state.selectedCoordinates);
  const referenceMode = useMapWorkspaceUiState((state) => state.referenceMode);
  const traceMode = useMapWorkspaceUiState((state) => state.traceMode);
  const markerMode = useMapWorkspaceUiState((state) => state.markerMode);
  const linkMode = useMapWorkspaceUiState((state) => state.linkMode);
  const graphPreviewOpen = useMapWorkspaceUiState((state) => state.graphPreviewOpen);
  const toolsPanelOpen = useMapWorkspaceUiState((state) => state.toolsPanelOpen);
  const {
    setReferenceMode,
    stopReferenceMode,
    setTraceMode,
    stopTraceMode,
    setMarkerMode,
    stopMarkerMode,
    setLinkMode,
    stopLinkMode,
    setPendingMapPoint,
    setStatusMessage,
    toggleToolsPanel,
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
    <header className="drag-region glass-panel relative z-20 flex h-11 shrink-0 items-center gap-2 border-b border-base-content/10 px-2">
      <DashboardSidebarTrigger onClick={toggleSidebar} collapsed={isCollapsed} />

      <Link
        to="/maps"
        className="no-drag inline-flex size-7 shrink-0 items-center justify-center rounded-md text-base-content/60 transition-colors hover:bg-base-content/10 hover:text-base-content"
        aria-label={t("maps.workspace.back")}
      >
        <ArrowLeft className="size-4" />
      </Link>

      <div className="no-drag flex min-w-0 flex-1 items-baseline gap-2">
        <h1 className="min-w-0 truncate text-sm font-semibold tracking-tight">{workspace.name}</h1>
        {coordinateLine ? (
          <span className="hidden truncate font-mono text-[11px] text-base-content/40 sm:inline">
            {coordinateLine}
          </span>
        ) : null}
      </div>

      <div className="no-drag flex shrink-0 items-center gap-0.5 rounded-lg border border-base-content/10 bg-base-100/50 p-0.5">
        <button
          type="button"
          className={
            referenceMode
              ? `${toolButtonClass} bg-primary text-primary-content`
              : inactiveToolClass()
          }
          disabled={!hasSourceFile || traceMode}
          title={t("maps.workspace.addReference")}
          aria-label={t("maps.workspace.addReference")}
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
          <span className="text-[10px] font-bold">R</span>
        </button>

        <button
          type="button"
          className={
            traceMode
              ? `${toolButtonClass} bg-secondary text-secondary-content`
              : inactiveToolClass()
          }
          disabled={referenceMode}
          title={t("maps.workspace.traceTrail")}
          aria-label={t("maps.workspace.traceTrail")}
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
          <Pencil className="size-3.5" />
        </button>

        <button
          type="button"
          className={
            markerMode ? `${toolButtonClass} bg-accent text-accent-content` : inactiveToolClass()
          }
          disabled={referenceMode || traceMode}
          title={t("maps.workspace.addMarker")}
          aria-label={t("maps.workspace.addMarker")}
          onClick={() => {
            if (markerMode) {
              stopMarkerMode();
              setStatusMessage(null);
              return;
            }
            stopReferenceMode();
            stopTraceMode();
            stopLinkMode();
            setMarkerMode(true);
            setStatusMessage(t("maps.workspace.markerHint"));
          }}
          data-test="marker-mode-toggle"
        >
          <MapPin className="size-3.5" />
        </button>

        <button
          type="button"
          className={
            linkMode ? `${toolButtonClass} bg-info text-info-content` : inactiveToolClass()
          }
          disabled={referenceMode || traceMode}
          title={t("maps.workspace.linkPoints")}
          aria-label={t("maps.workspace.linkPoints")}
          onClick={() => {
            if (linkMode) {
              stopLinkMode();
              setStatusMessage(null);
              return;
            }
            stopReferenceMode();
            stopTraceMode();
            stopMarkerMode();
            setLinkMode(true);
            setStatusMessage(t("maps.workspace.linkComposer.hint"));
          }}
          data-test="link-mode-toggle"
        >
          <Link2 className="size-3.5" />
        </button>

        {onToggleGraphPreview ? (
          <button
            type="button"
            className={
              graphPreviewOpen
                ? `${toolButtonClass} bg-secondary text-secondary-content`
                : inactiveToolClass()
            }
            disabled={referenceMode || traceMode}
            title={t("maps.workspace.graphPreview.visualize")}
            aria-label={t("maps.workspace.graphPreview.visualize")}
            onClick={onToggleGraphPreview}
            data-test="graph-preview-toggle"
          >
            <Network className="size-3.5" />
          </button>
        ) : null}
      </div>

      <button
        type="button"
        className={`no-drag ${toolButtonClass} ${
          toolsPanelOpen
            ? "bg-base-content/12 text-base-content"
            : "text-base-content/55 hover:bg-base-content/8 hover:text-base-content"
        }`}
        onClick={toggleToolsPanel}
        title={t("maps.workspace.toolsPanel.toggle")}
        aria-label={t("maps.workspace.toolsPanel.toggle")}
        data-test="toggle-tools-panel"
      >
        <PanelRightOpen className="size-4" />
      </button>
    </header>
  );
}
