import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useIpcMutation } from "@renderer/hooks/useIpc";
import { groupSegmentsByPath } from "@renderer/features/maps/lib/group-segments-by-path";
import type { GeoSegmentRecord } from "@shared/geo-segments.types";

type SegmentBuildFromPathPanelProps = {
  mapId: number;
  geoSegments: GeoSegmentRecord[];
  pathSlug?: string;
  onPathSlugChange?: (pathSlug: string) => void;
  onStatusMessage?: (message: string | null) => void;
  showPathSelect?: boolean;
};

export function SegmentBuildFromPathPanel({
  mapId,
  geoSegments,
  pathSlug,
  onPathSlugChange,
  onStatusMessage,
  showPathSelect = false,
}: SegmentBuildFromPathPanelProps) {
  const { t } = useTranslation();
  const pathGroups = groupSegmentsByPath(geoSegments);
  const [localPathSlug, setLocalPathSlug] = useState(pathGroups[0]?.groupId ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const previewBuild = useIpcMutation("segments:previewBuildFromPath");
  const buildSegments = useIpcMutation("segments:buildFromPath");

  const activeSlug = pathSlug || localPathSlug || pathGroups[0]?.groupId || "";

  function reportStatus(text: string | null) {
    setMessage(text);
    onStatusMessage?.(text);
  }

  async function handlePreview() {
    if (!activeSlug) {
      return;
    }
    reportStatus(null);
    try {
      const preview = await previewBuild.mutateAsync({
        mapId,
        pathSlug: activeSlug,
        maxProjectionDistanceMeters: 40,
      });
      if (preview.proposed.length === 0) {
        reportStatus(t("maps.workspace.buildSegmentsEmpty"));
        return;
      }
      reportStatus(preview.proposed.map((edge) => `${edge.fromRef}→${edge.toRef}`).join(", "));
    } catch (caught: unknown) {
      reportStatus(caught instanceof Error ? caught.message : String(caught));
    }
  }

  async function handleBuild() {
    if (!activeSlug) {
      return;
    }
    reportStatus(null);
    try {
      const result = await buildSegments.mutateAsync({
        mapId,
        pathSlug: activeSlug,
        replaceExisting: true,
        maxProjectionDistanceMeters: 40,
      });
      reportStatus(
        t("maps.workspace.buildSegmentsSuccess", {
          count: result.created.length,
          path: activeSlug,
        }),
      );
    } catch (caught: unknown) {
      reportStatus(caught instanceof Error ? caught.message : String(caught));
    }
  }

  if (pathGroups.length === 0) {
    return (
      <p className="text-sm text-base-content/55">{t("maps.workspace.buildSegmentsNoPaths")}</p>
    );
  }

  return (
    <div className="space-y-3" data-test="segment-build-from-path">
      <div className="space-y-1">
        <p className="text-sm font-semibold">{t("maps.workspace.buildSegmentsTitle")}</p>
        <p className="text-xs text-base-content/60">{t("maps.workspace.buildSegmentsHint")}</p>
      </div>
      {showPathSelect ? (
        <label className="form-control gap-1">
          <span className="label-text text-xs">{t("maps.workspace.buildSegmentsPath")}</span>
          <select
            className="select-bordered select w-full select-sm font-mono"
            value={activeSlug}
            onChange={(event) => {
              setLocalPathSlug(event.target.value);
              onPathSlugChange?.(event.target.value);
            }}
          >
            {pathGroups.map((path) => (
              <option key={path.groupId} value={path.groupId}>
                {path.groupId}
              </option>
            ))}
          </select>
        </label>
      ) : null}
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
          data-test="segment-build-from-path-run"
        >
          {t("maps.workspace.buildSegmentsRun")}
        </button>
      </div>
      {message ? <p className="text-xs text-base-content/70">{message}</p> : null}
    </div>
  );
}
