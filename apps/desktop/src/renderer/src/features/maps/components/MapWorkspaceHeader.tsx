import { Link } from "@tanstack/react-router";
import { ArrowLeft, RotateCw, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatMapCoordinates } from "../lib/copy-map-coordinates";
import { useMapWorkspaceUiState, useMapWorkspaceState } from "../store/MapWorkspaceProvider";

type MapWorkspaceHeaderProps = {
  onOpenControls: () => void;
};

async function hardReloadView() {
  await window.api.invoke("app:hardReload", undefined);
}

export function MapWorkspaceHeader({ onOpenControls }: MapWorkspaceHeaderProps) {
  const { t } = useTranslation();
  const workspace = useMapWorkspaceState((state) => state.workspace);
  const cursorCoordinates = useMapWorkspaceUiState((state) => state.cursorCoordinates);
  const selectedCoordinates = useMapWorkspaceUiState((state) => state.selectedCoordinates);
  const statusMessage = useMapWorkspaceUiState((state) => state.statusMessage);

  if (!workspace) {
    return null;
  }

  const coordinateLine = selectedCoordinates
    ? t("maps.workspace.selectedCoordinates", {
        value: formatMapCoordinates(selectedCoordinates.latitude, selectedCoordinates.longitude),
      })
    : cursorCoordinates
      ? t("maps.workspace.cursorCoordinates", {
          value: formatMapCoordinates(cursorCoordinates.latitude, cursorCoordinates.longitude),
        })
      : t("maps.workspace.coordinatesIdle");

  return (
    <header className="flex items-start justify-between gap-4 border-b border-base-content/10 px-4 py-3">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Link
          to="/maps"
          className="btn mt-0.5 btn-square shrink-0 btn-ghost btn-sm"
          aria-label={t("maps.workspace.back")}
        >
          <ArrowLeft className="size-4" />
        </Link>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{workspace.name}</h1>
          <div className="mt-1 min-h-5">
            {workspace.description ? (
              <p className="truncate text-sm text-base-content/60">{workspace.description}</p>
            ) : (
              <p className="text-sm opacity-0" aria-hidden>
                —
              </p>
            )}
          </div>
          <div className="mt-2 min-h-10 space-y-1">
            <p className="truncate font-mono text-xs text-base-content/50">{coordinateLine}</p>
            <p
              className={`truncate text-xs ${statusMessage ? "text-success" : "text-transparent"}`}
              aria-live="polite"
            >
              {statusMessage ?? t("maps.workspace.statusIdle")}
            </p>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          className="btn btn-square btn-outline btn-sm"
          onClick={() => void hardReloadView()}
          aria-label={t("maps.workspace.hardReload")}
          title={t("maps.workspace.hardReloadHint")}
          data-test="map-hard-reload"
        >
          <RotateCw className="size-4" />
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={onOpenControls}
          aria-label={t("maps.workspace.openControls")}
        >
          <Settings2 className="size-4" />
          {t("maps.workspace.controls")}
        </button>
      </div>
    </header>
  );
}
