import { useTranslation } from "react-i18next";
import type { GeoSegmentRecord } from "@shared/geo-segments.types";
import { useIpcMutation } from "@renderer/hooks/useIpc";
import {
  lineStringToMapBounds,
  segmentGroupColor,
} from "@renderer/features/maps/lib/segment-utils";
import { getViewportCommand } from "@renderer/features/maps/lib/viewport-command-registry";
import {
  useMapWorkspaceUiActions,
  useMapWorkspaceUiState,
} from "@renderer/features/maps/store/MapWorkspaceProvider";

type MapGeoSegmentsSectionProps = {
  mapId: number;
  segments: GeoSegmentRecord[];
};

export function MapGeoSegmentsSection({ mapId, segments }: MapGeoSegmentsSectionProps) {
  const { t } = useTranslation();
  const deleteSegment = useIpcMutation("geoSegments:delete");
  const editingSegmentId = useMapWorkspaceUiState((state) => state.editingSegmentId);
  const {
    closeControls,
    setTraceMode,
    stopReferenceMode,
    setEditingSegmentId,
    setSegmentGroupId,
    setSegmentName,
    setSegmentPathKind,
    setPendingTracePoints,
    setStatusMessage,
  } = useMapWorkspaceUiActions();

  function startEditingSegment(segment: GeoSegmentRecord) {
    stopReferenceMode();
    setEditingSegmentId(segment.id);
    setSegmentGroupId(segment.segmentGroupId);
    setSegmentName(segment.name ?? "");
    setSegmentPathKind(segment.pathKind);
    setPendingTracePoints(
      segment.geometry.coordinates.map(([longitude, latitude]: [number, number]) => ({
        latitude,
        longitude,
      })),
    );
    setTraceMode(true);
    const bounds = lineStringToMapBounds(segment.geometry.coordinates);
    if (bounds) {
      getViewportCommand(mapId)?.({ fitBounds: bounds });
    }
    closeControls();
    setStatusMessage(null);
  }

  return (
    <section className="flex flex-col gap-5 rounded-box bg-base-200/40 p-6">
      <div className="space-y-1.5">
        <h3 className="text-sm font-semibold tracking-tight">
          {t("maps.workspace.trailsSection")}
        </h3>
        <p className="text-sm leading-relaxed text-base-content/60">
          {t("maps.workspace.trailsSectionHint")}
        </p>
      </div>

      {segments.length === 0 ? (
        <p className="text-sm text-base-content/60" data-test="geo-segments-empty">
          {t("maps.workspace.trailsEmpty")}
        </p>
      ) : (
        <ul className="space-y-2" data-test="geo-segments-list">
          {segments.map((segment) => (
            <li
              key={segment.id}
              className="flex items-center justify-between gap-3 rounded-box border border-base-content/10 bg-base-100/70 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: segmentGroupColor(segment.segmentGroupId) }}
                  />
                  <span className="truncate text-sm font-medium">
                    {segment.name ?? `${segment.segmentGroupId} #${segment.segmentIndex + 1}`}
                  </span>
                </div>
                <p className="truncate text-xs text-base-content/60">
                  {segment.segmentGroupId} · {segment.geometry.coordinates.length} pts ·{" "}
                  {segment.status}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => startEditingSegment(segment)}
                  data-test={`geo-segment-edit-${segment.id}`}
                >
                  {t("maps.workspace.trailsEdit")}
                </button>
                <button
                  type="button"
                  className="btn text-error btn-ghost btn-xs"
                  disabled={deleteSegment.isPending}
                  onClick={() => {
                    void deleteSegment.mutateAsync({ mapId, segmentId: segment.id });
                    if (editingSegmentId === segment.id) {
                      setEditingSegmentId(null);
                      setPendingTracePoints([]);
                      setTraceMode(false);
                    }
                  }}
                  data-test={`geo-segment-delete-${segment.id}`}
                >
                  {t("maps.workspace.trailsDelete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
