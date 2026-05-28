import { useTranslation } from "react-i18next";
import { GEO_SEGMENT_PATH_KINDS } from "@shared/geo-segments.types";
import {
  useMapWorkspaceUiActions,
  useMapWorkspaceUiState,
} from "@renderer/features/maps/store/MapWorkspaceProvider";

type MapTraceTrailBarProps = {
  onFinish: () => void;
  onUndo: () => void;
  finishDisabled: boolean;
  finishPending: boolean;
};

export function MapTraceTrailBar({
  onFinish,
  onUndo,
  finishDisabled,
  finishPending,
}: MapTraceTrailBarProps) {
  const { t } = useTranslation();
  const pendingTracePoints = useMapWorkspaceUiState((state) => state.pendingTracePoints);
  const editingSegmentId = useMapWorkspaceUiState((state) => state.editingSegmentId);
  const segmentGroupId = useMapWorkspaceUiState((state) => state.segmentGroupId);
  const segmentName = useMapWorkspaceUiState((state) => state.segmentName);
  const segmentPathKind = useMapWorkspaceUiState((state) => state.segmentPathKind);
  const { setSegmentGroupId, setSegmentName, setSegmentPathKind, stopTraceMode } =
    useMapWorkspaceUiActions();

  return (
    <div
      className="flex shrink-0 flex-col gap-3 border-b border-secondary/20 bg-secondary/10 px-4 py-3 text-sm lg:flex-row lg:items-end lg:justify-between"
      data-test="trace-mode-hint"
    >
      <div className="space-y-2">
        <p>
          {editingSegmentId !== null
            ? t("maps.workspace.traceEditingHint")
            : t("maps.workspace.traceHint")}{" "}
          {t("maps.workspace.tracePointCount", { count: pendingTracePoints.length })}
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-medium" htmlFor="trace-group-id">
              {t("maps.workspace.traceGroupLabel")}
            </label>
            <input
              id="trace-group-id"
              className="input-bordered input input-sm w-full"
              value={segmentGroupId}
              onChange={(event) => setSegmentGroupId(event.currentTarget.value)}
              placeholder="10k-blue"
              data-test="trace-group-id"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium" htmlFor="trace-name">
              {t("maps.workspace.traceNameLabel")}
            </label>
            <input
              id="trace-name"
              className="input-bordered input input-sm w-full"
              value={segmentName}
              onChange={(event) => setSegmentName(event.currentTarget.value)}
              placeholder={t("maps.workspace.traceNamePlaceholder")}
              data-test="trace-name"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium" htmlFor="trace-path-kind">
              {t("maps.workspace.tracePathKindLabel")}
            </label>
            <select
              id="trace-path-kind"
              className="select-bordered select w-full select-sm"
              value={segmentPathKind}
              onChange={(event) =>
                setSegmentPathKind(event.currentTarget.value as typeof segmentPathKind)
              }
              data-test="trace-path-kind"
            >
              {GEO_SEGMENT_PATH_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={pendingTracePoints.length === 0}
          onClick={onUndo}
          data-test="trace-undo-point"
        >
          {t("maps.workspace.traceUndo")}
        </button>
        <button
          type="button"
          className="btn btn-sm"
          disabled={finishDisabled || finishPending}
          onClick={onFinish}
          data-test="trace-finish"
        >
          {editingSegmentId !== null
            ? t("maps.workspace.traceSave")
            : t("maps.workspace.traceFinish")}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => stopTraceMode()}
          data-test="trace-cancel"
        >
          {t("maps.workspace.traceCancel")}
        </button>
      </div>
    </div>
  );
}
