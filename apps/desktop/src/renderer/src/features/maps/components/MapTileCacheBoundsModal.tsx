import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { MapBaseMapStyle } from "@shared/maps.types";
import type { TileCacheCorner } from "@shared/tile-cache.types";
import { useIpcEvent } from "../../../hooks/useIpcEvent";
import { useBuildTileCacheMutation } from "../hooks/useBuildTileCacheMutation";
import { useTileCacheStatusQuery } from "../hooks/useTileCacheStatusQuery";
import { useWorkspacePersistence } from "../hooks/useWorkspacePersistence";
import { cornersFromBounds } from "../lib/tile-cache-bounds";
import {
  useMapWorkspaceState,
  useMapWorkspaceUiActions,
  useMapWorkspaceUiState,
} from "../store/MapWorkspaceProvider";
import { TileCacheBoundsPanel } from "./TileCacheBoundsPanel";

export function MapTileCacheBoundsModal() {
  const { t } = useTranslation();
  const workspace = useMapWorkspaceState((state) => state.workspace);
  const mapId = useMapWorkspaceState((state) => state.mapId);
  const isOpen = useMapWorkspaceUiState((state) => state.tileCacheBoundsOpen);
  const closeTileCacheBounds = useMapWorkspaceUiActions().closeTileCacheBounds;
  const { queueSave } = useWorkspacePersistence();
  const tileCache = useTileCacheStatusQuery(mapId);
  const buildCache = useBuildTileCacheMutation();

  const [corners, setCorners] = useState<TileCacheCorner[]>([]);
  const [cacheStyle, setCacheStyle] = useState<MapBaseMapStyle>("satellite");
  const [buildProgress, setBuildProgress] = useState<{ completed: number; total: number } | null>(
    null,
  );
  const [buildMessage, setBuildMessage] = useState<string | null>(null);

  useIpcEvent("tileCache:buildProgress", (progress) => {
    if (mapId !== progress.mapId) {
      return;
    }
    setBuildProgress({ completed: progress.completed, total: progress.total });
  });

  useEffect(() => {
    if (!isOpen || !workspace) {
      return;
    }

    setCacheStyle(tileCache.data?.style ?? workspace.baseMapStyle);
    setCorners(tileCache.data?.bounds ? cornersFromBounds(tileCache.data.bounds) : []);
    setBuildProgress(null);
    setBuildMessage(null);
  }, [isOpen, workspace, tileCache.data?.builtAt, tileCache.data?.bounds, tileCache.data?.style]);

  if (!isOpen || !workspace || !mapId) {
    return null;
  }

  const currentMapId = mapId;
  const currentWorkspace = workspace;

  const isBuilding = buildCache.isPending;
  const percent =
    buildProgress && buildProgress.total > 0
      ? Math.round((buildProgress.completed / buildProgress.total) * 100)
      : null;

  function addCorner(corner: TileCacheCorner) {
    setCorners((current) => (current.length >= 4 ? current : [...current, corner]));
  }

  function moveCorner(index: number, corner: TileCacheCorner) {
    setCorners((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? corner : item)),
    );
  }

  async function handleBuild() {
    if (corners.length !== 4) {
      return;
    }

    setBuildMessage(t("maps.create.cacheBuildingDescription"));
    setBuildProgress(null);

    try {
      if (cacheStyle !== currentWorkspace.baseMapStyle) {
        queueSave({ baseMapStyle: cacheStyle });
      }

      await buildCache.mutateAsync({
        mapId: currentMapId,
        corners,
        style: cacheStyle,
      });
      closeTileCacheBounds();
    } catch (error) {
      setBuildMessage(error instanceof Error ? error.message : t("maps.workspace.tileCacheError"));
    }
  }

  return (
    <div className="modal-open modal z-[60]">
      <div className="modal-box max-w-3xl px-8 py-8">
        <button
          type="button"
          className="btn absolute top-2 right-2 btn-circle btn-ghost btn-sm"
          disabled={isBuilding}
          onClick={closeTileCacheBounds}
          aria-label={t("maps.create.close")}
        >
          ✕
        </button>

        {isBuilding ? (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <span className="loading loading-lg loading-spinner text-primary" />
            <div>
              <p className="font-medium">{t("maps.create.cacheBuildingHeading")}</p>
              <p className="mt-1 text-sm text-base-content/60">
                {buildMessage ?? t("maps.create.cacheBuildingDescription")}
              </p>
              {percent != null ? (
                <p className="mt-3 text-sm font-medium text-primary">
                  {t("maps.create.cacheProgress", {
                    percent,
                    completed: buildProgress?.completed ?? 0,
                    total: buildProgress?.total ?? 0,
                  })}
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6 pr-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">{t("maps.create.cacheBoundsHeading")}</h2>
              <p className="text-sm text-base-content/60">{currentWorkspace.name}</p>
            </div>

            <TileCacheBoundsPanel
              corners={corners}
              cacheStyle={cacheStyle}
              locationQuery={currentWorkspace.locationQuery}
              latitude={currentWorkspace.mapCenterLat?.toString() ?? ""}
              longitude={currentWorkspace.mapCenterLng?.toString() ?? ""}
              onStyleChange={setCacheStyle}
              onCornerAdd={addCorner}
              onCornerMove={moveCorner}
              onResetCorners={() => setCorners([])}
              mapHeightClassName="h-80"
            />

            {buildCache.isError ? (
              <p className="text-sm text-error">
                {buildCache.error instanceof Error
                  ? buildCache.error.message
                  : t("maps.workspace.tileCacheError")}
              </p>
            ) : null}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                className="btn flex-1 btn-outline"
                onClick={closeTileCacheBounds}
              >
                {t("maps.create.close")}
              </button>
              <button
                type="button"
                className="btn flex-1 btn-primary"
                disabled={corners.length !== 4}
                onClick={() => void handleBuild()}
              >
                {t("maps.workspace.downloadTileCache")}
              </button>
            </div>
          </div>
        )}
      </div>
      <button
        type="button"
        className="modal-backdrop"
        disabled={isBuilding}
        onClick={closeTileCacheBounds}
        aria-hidden
      />
    </div>
  );
}
