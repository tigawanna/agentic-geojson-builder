import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Pencil, Trash2, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@renderer/lib/utils";
import { useIpcMutation } from "@renderer/hooks/useIpc";
import {
  exportMapPointsFile,
  type MapPointsExportFormat,
} from "@renderer/features/maps/lib/export-map-points";
import { parseMapPointsImportJson } from "@renderer/features/maps/lib/import-map-points";
import { filterMapPointsBySearch } from "@renderer/features/maps/lib/map-points-list-filter";
import { isMapDataExplorerSelectionEqual } from "@renderer/features/maps/hooks/useMapDataExplorerFocus";
import { useMapDataExplorerPageStore } from "@renderer/features/maps/store/map-data-explorer-page-store";
import type { MapDataExplorerSelection } from "@renderer/features/maps/types/map-data-explorer.types";
import type { MapPointRecord } from "@shared/map-points.types";
import { resolveMapPointTypeFromRecord } from "@shared/map-point-type";

type MapPointsExplorerTableProps = {
  mapId: number;
  mapPoints: MapPointRecord[];
  selection: MapDataExplorerSelection | null;
  onSelectRow: (selection: MapDataExplorerSelection | null) => void;
};

function selectRowClass(isSelected: boolean) {
  return cn(
    "group cursor-pointer transition-colors",
    isSelected ? "bg-primary/12 hover:bg-primary/16" : "hover:bg-base-200/60",
  );
}

export function MapPointsExplorerTable({
  mapId,
  mapPoints,
  selection,
  onSelectRow,
}: MapPointsExplorerTableProps) {
  const { t } = useTranslation();
  const setEditTarget = useMapDataExplorerPageStore((state) => state.setEditTarget);
  const setStatusMessage = useMapDataExplorerPageStore((state) => state.setStatusMessage);
  const setCheckedMapPointIds = useMapDataExplorerPageStore((state) => state.setCheckedMapPointIds);
  const deleteMapPoint = useIpcMutation("mapPoints:delete");
  const createMapPoint = useIpcMutation("mapPoints:create");
  const importInputRef = useRef<HTMLInputElement>(null);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(() => new Set());
  const [isBulkWorking, setIsBulkWorking] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [exportFormat, setExportFormat] = useState<MapPointsExportFormat>("json");

  const displayedMapPoints = useMemo(
    () => filterMapPointsBySearch(mapPoints, searchQuery),
    [mapPoints, searchQuery],
  );

  const mapPointIds = useMemo(
    () => new Set(displayedMapPoints.map((point) => point.id)),
    [displayedMapPoints],
  );

  useEffect(() => {
    setCheckedIds((previous) => {
      const next = new Set<number>();
      for (const id of previous) {
        if (mapPointIds.has(id)) {
          next.add(id);
        }
      }
      return next.size === previous.size ? previous : next;
    });
  }, [mapPointIds]);

  useEffect(() => {
    setCheckedMapPointIds(Array.from(checkedIds));
  }, [checkedIds, setCheckedMapPointIds]);

  const checkedCount = checkedIds.size;
  const allChecked = displayedMapPoints.length > 0 && checkedCount === displayedMapPoints.length;
  const someChecked = checkedCount > 0 && !allChecked;

  const selectedMapPoints = useMemo(
    () => displayedMapPoints.filter((point) => checkedIds.has(point.id)),
    [checkedIds, displayedMapPoints],
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
    setCheckedIds(new Set(displayedMapPoints.map((point) => point.id)));
  }

  function openEdit(id: number) {
    setEditTarget({ kind: "map-point", id });
  }

  async function deleteOne(point: MapPointRecord) {
    await deleteMapPoint.mutateAsync({ mapId, pointId: point.id });
    setCheckedIds((previous) => {
      if (!previous.has(point.id)) {
        return previous;
      }
      const next = new Set(previous);
      next.delete(point.id);
      return next;
    });
    if (selection?.kind === "map-point" && selection.id === point.id) {
      onSelectRow(null);
    }
    setStatusMessage(t("maps.workspace.dataExplorer.markers.rowActions.deleted"));
  }

  async function deleteSelected() {
    if (selectedMapPoints.length === 0) {
      return;
    }
    const confirmed = window.confirm(
      t("maps.workspace.dataExplorer.markers.bulk.deleteConfirm", {
        count: selectedMapPoints.length,
      }),
    );
    if (!confirmed) {
      return;
    }

    setIsBulkWorking(true);
    try {
      for (const point of selectedMapPoints) {
        await deleteMapPoint.mutateAsync({ mapId, pointId: point.id });
      }
      setCheckedIds(new Set());
      if (selection?.kind === "map-point" && checkedIds.has(selection.id)) {
        onSelectRow(null);
      }
      setStatusMessage(
        t("maps.workspace.dataExplorer.markers.bulk.deleted", {
          count: selectedMapPoints.length,
        }),
      );
    } finally {
      setIsBulkWorking(false);
    }
  }

  function exportSelected(format: "json" | "csv" | "geojson") {
    if (selectedMapPoints.length === 0) {
      return;
    }
    exportMapPointsFile(selectedMapPoints, mapId, format);
    setStatusMessage(
      t("maps.workspace.dataExplorer.markers.bulk.exported", {
        count: selectedMapPoints.length,
        format: format === "geojson" ? "GeoJSON" : format.toUpperCase(),
      }),
    );
  }

  async function importFromFile(file: File) {
    setIsBulkWorking(true);
    try {
      const text = await file.text();
      const inputs = parseMapPointsImportJson(text, mapId);
      if (inputs.length === 0) {
        setStatusMessage(t("maps.workspace.dataExplorer.markers.importEmpty"));
        return;
      }
      let created = 0;
      for (const input of inputs) {
        await createMapPoint.mutateAsync(input);
        created += 1;
      }
      setStatusMessage(t("maps.workspace.dataExplorer.markers.imported", { count: created }));
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : t("maps.workspace.dataExplorer.markers.importError"),
      );
    } finally {
      setIsBulkWorking(false);
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  }

  return (
    <div className="space-y-2" data-test="map-points-explorer-table">
      <p className="text-xs text-base-content/55">
        {t("maps.workspace.dataExplorer.pointsTabHint")}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label className="input-bordered input input-sm flex min-w-0 flex-1 items-center gap-2">
          <input
            type="search"
            className="grow bg-transparent outline-none"
            value={searchQuery}
            placeholder={t("maps.workspace.dataExplorer.markers.searchPlaceholder")}
            onChange={(event) => setSearchQuery(event.target.value)}
            data-test="map-points-search"
          />
        </label>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void importFromFile(file);
            }
          }}
        />
        <button
          type="button"
          className="btn gap-1 btn-outline btn-sm"
          disabled={isBulkWorking}
          onClick={() => importInputRef.current?.click()}
          data-test="map-points-import-json"
        >
          <Upload className="size-3.5" />
          {t("maps.workspace.dataExplorer.markers.importJson")}
        </button>
      </div>

      {checkedCount > 0 ? (
        <div
          className="flex flex-wrap items-center gap-2 rounded-box border border-base-content/10 bg-base-200/40 px-3 py-2"
          data-test="map-points-bulk-bar"
        >
          <span className="text-xs font-medium text-base-content/70">
            {t("maps.workspace.dataExplorer.markers.bulk.selected", { count: checkedCount })}
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <label className="flex items-center gap-1.5">
              <span className="sr-only">
                {t("maps.workspace.dataExplorer.markers.bulk.exportFormat")}
              </span>
              <select
                className="select-bordered select select-xs"
                value={exportFormat}
                disabled={isBulkWorking}
                onChange={(event) => setExportFormat(event.target.value as MapPointsExportFormat)}
                data-test="map-points-export-format"
              >
                <option value="json">
                  {t("maps.workspace.dataExplorer.markers.bulk.exportJson")}
                </option>
                <option value="csv">
                  {t("maps.workspace.dataExplorer.markers.bulk.exportCsv")}
                </option>
                <option value="geojson">
                  {t("maps.workspace.dataExplorer.markers.bulk.exportGeoJson")}
                </option>
              </select>
            </label>
            <button
              type="button"
              className="btn gap-1 btn-ghost btn-xs"
              disabled={isBulkWorking}
              onClick={() => exportSelected(exportFormat)}
              data-test="map-points-export"
            >
              <Download className="size-3" />
              {t("maps.workspace.dataExplorer.markers.bulk.export")}
            </button>
            <button
              type="button"
              className="btn gap-1 btn-xs btn-error"
              disabled={isBulkWorking}
              onClick={() => void deleteSelected()}
              data-test="map-points-bulk-delete"
            >
              <Trash2 className="size-3" />
              {t("maps.workspace.dataExplorer.markers.bulk.delete")}
            </button>
          </div>
        </div>
      ) : null}

      {mapPoints.length === 0 ? (
        <p className="px-1 py-6 text-sm text-base-content/55">
          {t("maps.workspace.dataExplorer.emptyMapPoints")}
        </p>
      ) : null}

      {mapPoints.length > 0 && displayedMapPoints.length === 0 ? (
        <p className="px-1 py-6 text-sm text-base-content/55">
          {t("maps.workspace.dataExplorer.markers.noMatches")}
        </p>
      ) : null}

      {displayedMapPoints.length > 0 ? (
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
                    aria-label={t("maps.workspace.dataExplorer.markers.bulk.selectAll")}
                    data-test="map-points-select-all"
                  />
                </th>
                <th>ID</th>
                <th>ref</th>
                <th>{t("maps.workspace.dataExplorer.name")}</th>
                <th>{t("maps.workspace.dataExplorer.altitude")}</th>
                <th>{t("maps.workspace.dataExplorer.markerType")}</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {displayedMapPoints.map((point) => {
                const rowSelection: MapDataExplorerSelection = {
                  kind: "map-point",
                  id: point.id,
                };
                const isRowSelected = isMapDataExplorerSelectionEqual(selection, rowSelection);
                const isChecked = checkedIds.has(point.id);

                return (
                  <tr
                    key={point.id}
                    className={selectRowClass(isRowSelected)}
                    onClick={() => onSelectRow(rowSelection)}
                    data-test={`data-explorer-map-point-${point.id}`}
                  >
                    <td>
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        checked={isChecked}
                        onClick={(event) => event.stopPropagation()}
                        onChange={() => toggleChecked(point.id)}
                        aria-label={t("maps.workspace.dataExplorer.markers.bulk.selectRow", {
                          id: point.id,
                        })}
                        data-test={`map-points-check-${point.id}`}
                      />
                    </td>
                    <td className="font-mono text-xs">{point.id}</td>
                    <td className="font-mono text-xs">{point.ref ?? "—"}</td>
                    <td>{point.name ?? "—"}</td>
                    <td className="font-mono text-xs">
                      {point.elevation !== null ? `${point.elevation.toFixed(0)} m` : "—"}
                    </td>
                    <td>{resolveMapPointTypeFromRecord(point)}</td>
                    <td>
                      <div className="flex justify-end gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                        <button
                          type="button"
                          className="btn btn-circle btn-ghost btn-xs"
                          aria-label={t("maps.workspace.dataExplorer.markers.rowActions.edit")}
                          onClick={(event) => {
                            event.stopPropagation();
                            openEdit(point.id);
                          }}
                          data-test={`map-points-edit-${point.id}`}
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-circle text-error btn-ghost btn-xs"
                          aria-label={t("maps.workspace.dataExplorer.markers.rowActions.delete")}
                          disabled={deleteMapPoint.isPending || isBulkWorking}
                          onClick={(event) => {
                            event.stopPropagation();
                            void deleteOne(point);
                          }}
                          data-test={`map-points-delete-${point.id}`}
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
