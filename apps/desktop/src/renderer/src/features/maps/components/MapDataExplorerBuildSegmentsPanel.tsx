import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useIpcMutation } from "@renderer/hooks/useIpc";
import { groupSegmentsByPath } from "@renderer/features/maps/lib/group-segments-by-path";
import type { GeoSegmentRecord } from "@shared/geo-segments.types";
import { useMapDataExplorerPageStore } from "@renderer/features/maps/store/map-data-explorer-page-store";

type MapDataExplorerBuildSegmentsPanelProps = {
  mapId: number;
  geoSegments: GeoSegmentRecord[];
};

export function MapDataExplorerBuildSegmentsPanel({
  mapId,
  geoSegments,
}: MapDataExplorerBuildSegmentsPanelProps) {
  const { t } = useTranslation();
  const setStatusMessage = useMapDataExplorerPageStore((state) => state.setStatusMessage);
  const pathGroups = groupSegmentsByPath(geoSegments);
  const [pathSlug, setPathSlug] = useState(pathGroups[0]?.groupId ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const previewBuild = useIpcMutation("segments:previewBuildFromPath");
  const buildSegments = useIpcMutation("segments:buildFromPath");

  const activeSlug = pathSlug || pathGroups[0]?.groupId || "";

  async function handlePreview() {
    if (!activeSlug) {
      return;
    }
    setMessage(null);
    try {
      const preview = await previewBuild.mutateAsync({
        mapId,
        pathSlug: activeSlug,
        maxProjectionDistanceMeters: 40,
      });
      if (preview.proposed.length === 0) {
        setMessage(t("maps.workspace.buildSegmentsEmpty"));
        return;
      }
      setMessage(preview.proposed.map((edge) => `${edge.fromRef}→${edge.toRef}`).join(", "));
    } catch (caught: unknown) {
      setMessage(caught instanceof Error ? caught.message : String(caught));
    }
  }

  async function handleBuild() {
    if (!activeSlug) {
      return;
    }
    setMessage(null);
    try {
      const result = await buildSegments.mutateAsync({
        mapId,
        pathSlug: activeSlug,
        replaceExisting: true,
        maxProjectionDistanceMeters: 40,
      });
      const text = t("maps.workspace.buildSegmentsSuccess", {
        count: result.created.length,
        path: activeSlug,
      });
      setMessage(text);
      setStatusMessage(text);
    } catch (caught: unknown) {
      setMessage(caught instanceof Error ? caught.message : String(caught));
    }
  }

  if (pathGroups.length === 0) {
    return (
      <p className="mb-3 text-sm text-base-content/55">
        {t("maps.workspace.buildSegmentsNoPaths")}
      </p>
    );
  }

  return (
    <div
      className="mb-4 space-y-3 rounded-box border border-primary/20 bg-primary/5 p-4"
      data-test="data-explorer-build-segments"
    >
      <p className="text-sm font-semibold">{t("maps.workspace.buildSegmentsTitle")}</p>
      <p className="text-xs text-base-content/60">{t("maps.workspace.buildSegmentsHint")}</p>
      <label className="form-control gap-1">
        <span className="label-text text-xs">{t("maps.workspace.buildSegmentsPath")}</span>
        <select
          className="select-bordered select w-full select-sm font-mono"
          value={activeSlug}
          onChange={(event) => setPathSlug(event.target.value)}
        >
          {pathGroups.map((path) => (
            <option key={path.groupId} value={path.groupId}>
              {path.groupId}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={previewBuild.isPending}
          onClick={() => void handlePreview()}
        >
          {t("maps.workspace.buildSegmentsPreview")}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          disabled={buildSegments.isPending}
          onClick={() => void handleBuild()}
          data-test="data-explorer-build-segments-run"
        >
          {t("maps.workspace.buildSegmentsRun")}
        </button>
      </div>
      {message ? <p className="text-xs text-base-content/70">{message}</p> : null}
    </div>
  );
}
