import { useEffect, useMemo, useState } from "react";
import { Download, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@renderer/lib/utils";
import { useIpcMutation } from "@renderer/hooks/useIpc";
import { ControlPointsFilterBar } from "@renderer/features/maps/components/ControlPointsFilterBar";
import { applyControlPointsFilterQuery } from "@renderer/features/maps/lib/control-points-filter-query";
import { haversineDistanceMeters } from "@repo/isomorphic/nearest-line-point";
import { exportControlPointsFile } from "@renderer/features/maps/lib/export-control-points";
import { isMapDataExplorerSelectionEqual } from "@renderer/features/maps/hooks/useMapDataExplorerFocus";
import { useMapDataExplorerPageStore } from "@renderer/features/maps/store/map-data-explorer-page-store";
import type { MapDataExplorerSelection } from "@renderer/features/maps/types/map-data-explorer.types";
import type { ControlPointRecord } from "@shared/control-points.types";

type ControlPointsExplorerTableProps = {
  mapId: number;
  controlPoints: ControlPointRecord[];
  selection: MapDataExplorerSelection | null;
  onSelectRow: (selection: MapDataExplorerSelection | null) => void;
};

function selectRowClass(isSelected: boolean) {
  return cn(
    "group cursor-pointer transition-colors",
    isSelected ? "bg-primary/12 hover:bg-primary/16" : "hover:bg-base-200/60",
  );
}

export function ControlPointsExplorerTable({
  mapId,
  controlPoints,
  selection,
  onSelectRow,
}: ControlPointsExplorerTableProps) {
  const { t } = useTranslation();
  const setEditTarget = useMapDataExplorerPageStore((state) => state.setEditTarget);
  const setStatusMessage = useMapDataExplorerPageStore((state) => state.setStatusMessage);
  const deleteControlPoint = useIpcMutation("controlPoints:delete");
  const [checkedIds, setCheckedIds] = useState<Set<number>>(() => new Set());
  const [isBulkWorking, setIsBulkWorking] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");

  const { rows: displayedControlPoints, state: filterState } = useMemo(
    () => applyControlPointsFilterQuery(controlPoints, filterQuery),
    [controlPoints, filterQuery],
  );

  const showDistanceColumn =
    filterState.sort === "distance-asc" || filterState.sort === "distance-desc";
  const distanceOriginLat = filterState.nearLatitude ?? filterState.latitude;
  const distanceOriginLng = filterState.nearLongitude ?? filterState.longitude;

  const controlPointIds = useMemo(
    () => new Set(displayedControlPoints.map((point) => point.id)),
    [displayedControlPoints],
  );

  useEffect(() => {
    setCheckedIds((previous) => {
      const next = new Set<number>();
      for (const id of previous) {
        if (controlPointIds.has(id)) {
          next.add(id);
        }
      }
      return next.size === previous.size ? previous : next;
    });
  }, [controlPointIds]);

  const checkedCount = checkedIds.size;
  const allChecked =
    displayedControlPoints.length > 0 && checkedCount === displayedControlPoints.length;
  const someChecked = checkedCount > 0 && !allChecked;

  const selectedControlPoints = useMemo(
    () => displayedControlPoints.filter((point) => checkedIds.has(point.id)),
    [checkedIds, displayedControlPoints],
  );

  function toggleChecked(id: number) {
    setCheckedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (allChecked) {
      setCheckedIds(new Set());
      return;
    }
    setCheckedIds(new Set(displayedControlPoints.map((point) => point.id)));
  }

  function openEdit(id: number) {
    setEditTarget({ kind: "control-point", id });
  }

  async function deleteOne(point: ControlPointRecord) {
    await deleteControlPoint.mutateAsync({
      mapId,
      controlPointId: point.id,
    });
    setCheckedIds((previous) => {
      if (!previous.has(point.id)) {
        return previous;
      }
      const next = new Set(previous);
      next.delete(point.id);
      return next;
    });
    if (selection?.kind === "control-point" && selection.id === point.id) {
      onSelectRow(null);
    }
    setStatusMessage(t("maps.workspace.dataExplorer.rowActions.deleted"));
  }

  async function deleteSelected() {
    if (selectedControlPoints.length === 0) {
      return;
    }
    const confirmed = window.confirm(
      t("maps.workspace.dataExplorer.bulk.deleteConfirm", {
        count: selectedControlPoints.length,
      }),
    );
    if (!confirmed) {
      return;
    }

    setIsBulkWorking(true);
    try {
      for (const point of selectedControlPoints) {
        await deleteControlPoint.mutateAsync({
          mapId,
          controlPointId: point.id,
        });
      }
      setCheckedIds(new Set());
      if (selection?.kind === "control-point" && checkedIds.has(selection.id)) {
        onSelectRow(null);
      }
      setStatusMessage(
        t("maps.workspace.dataExplorer.bulk.deleted", {
          count: selectedControlPoints.length,
        }),
      );
    } finally {
      setIsBulkWorking(false);
    }
  }

  function exportSelected(format: "json" | "csv" | "geojson") {
    if (selectedControlPoints.length === 0) {
      return;
    }
    exportControlPointsFile(selectedControlPoints, mapId, format);
    setStatusMessage(
      t("maps.workspace.dataExplorer.bulk.exported", {
        count: selectedControlPoints.length,
        format: format === "geojson" ? "GeoJSON" : format.toUpperCase(),
      }),
    );
  }

  if (controlPoints.length === 0) {
    return (
      <p className="px-1 py-6 text-sm text-base-content/55">
        {t("maps.workspace.dataExplorer.emptyControlPoints")}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <ControlPointsFilterBar
        filterQuery={filterQuery}
        onFilterQueryChange={setFilterQuery}
        resultCount={displayedControlPoints.length}
        totalCount={controlPoints.length}
      />

      {displayedControlPoints.length === 0 ? (
        <p className="px-1 py-6 text-sm text-base-content/55">
          {t("maps.workspace.dataExplorer.filters.noMatches")}
        </p>
      ) : null}
      {checkedCount > 0 ? (
        <div
          className="flex flex-wrap items-center gap-2 rounded-box border border-base-content/10 bg-base-200/40 px-3 py-2"
          data-test="control-points-bulk-bar"
        >
          <span className="text-xs font-medium text-base-content/70">
            {t("maps.workspace.dataExplorer.bulk.selected", { count: checkedCount })}
          </span>
          <div className="ml-auto flex flex-wrap gap-1.5">
            <button
              type="button"
              className="btn gap-1 btn-ghost btn-xs"
              disabled={isBulkWorking}
              onClick={() => exportSelected("json")}
              data-test="control-points-export-json"
            >
              <Download className="size-3" />
              {t("maps.workspace.dataExplorer.bulk.exportJson")}
            </button>
            <button
              type="button"
              className="btn gap-1 btn-ghost btn-xs"
              disabled={isBulkWorking}
              onClick={() => exportSelected("csv")}
              data-test="control-points-export-csv"
            >
              <Download className="size-3" />
              {t("maps.workspace.dataExplorer.bulk.exportCsv")}
            </button>
            <button
              type="button"
              className="btn gap-1 btn-ghost btn-xs"
              disabled={isBulkWorking}
              onClick={() => exportSelected("geojson")}
              data-test="control-points-export-geojson"
            >
              <Download className="size-3" />
              {t("maps.workspace.dataExplorer.bulk.exportGeoJson")}
            </button>
            <button
              type="button"
              className="btn gap-1 btn-xs btn-error"
              disabled={isBulkWorking}
              onClick={() => void deleteSelected()}
              data-test="control-points-bulk-delete"
            >
              <Trash2 className="size-3" />
              {t("maps.workspace.dataExplorer.bulk.delete")}
            </button>
          </div>
        </div>
      ) : null}

      {displayedControlPoints.length > 0 ? (
        <div className="overflow-x-auto rounded-box border border-base-content/10">
          <table className="table-pin-rows table table-sm">
            <thead>
              <tr className="text-base-content/50">
                <th className="w-10">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={allChecked}
                    ref={(element) => {
                      if (element) {
                        element.indeterminate = someChecked;
                      }
                    }}
                    onChange={toggleSelectAll}
                    aria-label={t("maps.workspace.dataExplorer.bulk.selectAll")}
                    data-test="control-points-select-all"
                  />
                </th>
                <th>ID</th>
                <th>{t("maps.workspace.dataExplorer.label")}</th>
                <th>{t("maps.workspace.dataExplorer.altitude")}</th>
                <th>{t("maps.workspace.dataExplorer.coordinates")}</th>
                {showDistanceColumn ? (
                  <th>{t("maps.workspace.dataExplorer.filters.distance")}</th>
                ) : null}
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {displayedControlPoints.map((point) => {
                const rowSelection: MapDataExplorerSelection = {
                  kind: "control-point",
                  id: point.id,
                };
                const isRowSelected = isMapDataExplorerSelectionEqual(selection, rowSelection);
                const isChecked = checkedIds.has(point.id);

                return (
                  <tr
                    key={point.id}
                    className={selectRowClass(isRowSelected)}
                    onClick={() => onSelectRow(rowSelection)}
                    data-test={`data-explorer-control-point-${point.id}`}
                  >
                    <td>
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        checked={isChecked}
                        onClick={(event) => event.stopPropagation()}
                        onChange={() => toggleChecked(point.id)}
                        aria-label={t("maps.workspace.dataExplorer.bulk.selectRow", {
                          id: point.id,
                        })}
                        data-test={`control-points-check-${point.id}`}
                      />
                    </td>
                    <td className="font-mono text-xs">{point.id}</td>
                    <td>{point.label ?? point.poleNumber ?? "—"}</td>
                    <td className="font-mono text-xs">
                      {point.altitudeM !== null ? `${point.altitudeM.toFixed(0)} m` : "—"}
                    </td>
                    <td className="font-mono text-xs">
                      {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
                    </td>
                    {showDistanceColumn &&
                    distanceOriginLat !== null &&
                    distanceOriginLng !== null ? (
                      <td className="font-mono text-xs text-base-content/70">
                        {haversineDistanceMeters(
                          point.latitude,
                          point.longitude,
                          distanceOriginLat,
                          distanceOriginLng,
                        ).toFixed(0)}{" "}
                        m
                      </td>
                    ) : showDistanceColumn ? (
                      <td>—</td>
                    ) : null}
                    <td>
                      <div className="flex justify-end gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                        <button
                          type="button"
                          className="btn btn-circle btn-ghost btn-xs"
                          aria-label={t("maps.workspace.dataExplorer.rowActions.edit")}
                          onClick={(event) => {
                            event.stopPropagation();
                            openEdit(point.id);
                          }}
                          data-test={`control-points-edit-${point.id}`}
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-circle text-error btn-ghost btn-xs"
                          aria-label={t("maps.workspace.dataExplorer.rowActions.delete")}
                          disabled={deleteControlPoint.isPending || isBulkWorking}
                          onClick={(event) => {
                            event.stopPropagation();
                            void deleteOne(point);
                          }}
                          data-test={`control-points-delete-${point.id}`}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
