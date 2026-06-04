import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@renderer/lib/utils";
import { AuditLogPanel } from "@renderer/features/audit-log/components/AuditLogPanel";
import { groupSegmentsByPath } from "@renderer/features/maps/lib/group-segments-by-path";
import { segmentGroupColor } from "@renderer/features/maps/lib/segment-utils";
import { isMapDataExplorerSelectionEqual } from "@renderer/features/maps/hooks/useMapDataExplorerFocus";
import { useMapDataExplorerPageStore } from "@renderer/features/maps/store/map-data-explorer-page-store";
import type { MapDataExplorerSelection } from "@renderer/features/maps/types/map-data-explorer.types";
import type { ControlPointRecord } from "@shared/control-points.types";
import type { GeoSegmentRecord } from "@shared/geo-segments.types";
import type { MapLinkRecord } from "@shared/map-links.types";
import type { MapPointRecord } from "@shared/map-points.types";

type MapDataExplorerTablesProps = {
  mapId: number;
  controlPoints: ControlPointRecord[];
  mapPoints: MapPointRecord[];
  geoSegments: GeoSegmentRecord[];
  mapLinks: MapLinkRecord[];
};

function ExplorerTable({
  children,
  emptyMessage,
  isEmpty,
}: {
  children: ReactNode;
  emptyMessage: string;
  isEmpty: boolean;
}) {
  if (isEmpty) {
    return <p className="px-1 py-6 text-sm text-base-content/55">{emptyMessage}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-box border border-base-content/10">
      <table className="table-pin-rows table table-sm">{children}</table>
    </div>
  );
}

function selectRowClass(isSelected: boolean) {
  return cn(
    "cursor-pointer transition-colors",
    isSelected ? "bg-primary/12 hover:bg-primary/16" : "hover:bg-base-200/60",
  );
}

export function MapDataExplorerTables({
  mapId,
  controlPoints,
  mapPoints,
  geoSegments,
  mapLinks,
}: MapDataExplorerTablesProps) {
  const { t } = useTranslation();
  const tab = useMapDataExplorerPageStore((state) => state.tab);
  const selection = useMapDataExplorerPageStore((state) => state.selection);
  const setSelection = useMapDataExplorerPageStore((state) => state.setSelection);
  const pathGroups = groupSegmentsByPath(geoSegments);

  function selectRow(next: MapDataExplorerSelection) {
    if (isMapDataExplorerSelectionEqual(selection, next)) {
      setSelection(null);
      return;
    }
    setSelection(next);
  }

  if (tab === "history") {
    return <AuditLogPanel mapId={mapId} fillHeight className="min-h-0 flex-1" />;
  }

  if (tab === "points") {
    return (
      <div className="space-y-6">
        <section className="space-y-2">
          <h4 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
            {t("maps.workspace.dataExplorer.referencePoints")}
          </h4>
          <ExplorerTable
            isEmpty={controlPoints.length === 0}
            emptyMessage={t("maps.workspace.dataExplorer.emptyControlPoints")}
          >
            <thead>
              <tr className="text-base-content/50">
                <th>ID</th>
                <th>{t("maps.workspace.dataExplorer.label")}</th>
                <th>{t("maps.workspace.dataExplorer.altitude")}</th>
                <th>{t("maps.workspace.dataExplorer.coordinates")}</th>
              </tr>
            </thead>
            <tbody>
              {controlPoints.map((point) => {
                const rowSelection: MapDataExplorerSelection = {
                  kind: "control-point",
                  id: point.id,
                };
                const isSelected = isMapDataExplorerSelectionEqual(selection, rowSelection);
                return (
                  <tr
                    key={point.id}
                    className={selectRowClass(isSelected)}
                    onClick={() => selectRow(rowSelection)}
                    data-test={`data-explorer-control-point-${point.id}`}
                  >
                    <td className="font-mono text-xs">{point.id}</td>
                    <td>{point.label ?? point.poleNumber ?? "—"}</td>
                    <td className="font-mono text-xs">
                      {point.altitudeM !== null ? `${point.altitudeM.toFixed(0)} m` : "—"}
                    </td>
                    <td className="font-mono text-xs">
                      {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </ExplorerTable>
        </section>

        <section className="space-y-2">
          <h4 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
            {t("maps.workspace.dataExplorer.mapPoints")}
          </h4>
          <ExplorerTable
            isEmpty={mapPoints.length === 0}
            emptyMessage={t("maps.workspace.dataExplorer.emptyMapPoints")}
          >
            <thead>
              <tr className="text-base-content/50">
                <th>ID</th>
                <th>ref</th>
                <th>{t("maps.workspace.dataExplorer.name")}</th>
                <th>{t("maps.workspace.dataExplorer.altitude")}</th>
                <th>{t("maps.workspace.dataExplorer.category")}</th>
              </tr>
            </thead>
            <tbody>
              {mapPoints.map((point) => {
                const rowSelection: MapDataExplorerSelection = {
                  kind: "map-point",
                  id: point.id,
                };
                const isSelected = isMapDataExplorerSelectionEqual(selection, rowSelection);
                return (
                  <tr
                    key={point.id}
                    className={selectRowClass(isSelected)}
                    onClick={() => selectRow(rowSelection)}
                    data-test={`data-explorer-map-point-${point.id}`}
                  >
                    <td className="font-mono text-xs">{point.id}</td>
                    <td className="font-mono text-xs">{point.ref ?? "—"}</td>
                    <td>{point.name ?? "—"}</td>
                    <td className="font-mono text-xs">
                      {point.elevation !== null ? `${point.elevation.toFixed(0)} m` : "—"}
                    </td>
                    <td>{point.category}</td>
                  </tr>
                );
              })}
            </tbody>
          </ExplorerTable>
        </section>
      </div>
    );
  }

  if (tab === "segments") {
    return (
      <ExplorerTable
        isEmpty={geoSegments.length === 0}
        emptyMessage={t("maps.workspace.dataExplorer.emptySegments")}
      >
        <thead>
          <tr className="text-base-content/50">
            <th />
            <th>ID</th>
            <th>{t("maps.workspace.dataExplorer.name")}</th>
            <th>{t("maps.workspace.dataExplorer.pathGroup")}</th>
            <th>{t("maps.workspace.dataExplorer.vertices")}</th>
            <th>{t("maps.workspace.dataExplorer.status")}</th>
          </tr>
        </thead>
        <tbody>
          {geoSegments.map((segment) => {
            const rowSelection: MapDataExplorerSelection = { kind: "segment", id: segment.id };
            const isSelected = isMapDataExplorerSelectionEqual(selection, rowSelection);
            return (
              <tr
                key={segment.id}
                className={selectRowClass(isSelected)}
                onClick={() => selectRow(rowSelection)}
                data-test={`data-explorer-segment-${segment.id}`}
              >
                <td>
                  <span
                    className="inline-block size-2.5 rounded-full"
                    style={{ backgroundColor: segmentGroupColor(segment.segmentGroupId) }}
                  />
                </td>
                <td className="font-mono text-xs">{segment.id}</td>
                <td>{segment.name ?? `${segment.segmentGroupId} #${segment.segmentIndex + 1}`}</td>
                <td className="font-mono text-xs">{segment.segmentGroupId}</td>
                <td>{segment.geometry.coordinates.length}</td>
                <td>{segment.status}</td>
              </tr>
            );
          })}
        </tbody>
      </ExplorerTable>
    );
  }

  if (tab === "paths") {
    return (
      <ExplorerTable
        isEmpty={pathGroups.length === 0}
        emptyMessage={t("maps.workspace.dataExplorer.emptyPaths")}
      >
        <thead>
          <tr className="text-base-content/50">
            <th />
            <th>{t("maps.workspace.dataExplorer.pathGroup")}</th>
            <th>{t("maps.workspace.dataExplorer.name")}</th>
            <th>{t("maps.workspace.dataExplorer.segments")}</th>
            <th>{t("maps.workspace.dataExplorer.vertices")}</th>
            <th>{t("maps.workspace.dataExplorer.kind")}</th>
          </tr>
        </thead>
        <tbody>
          {pathGroups.map((path) => {
            const rowSelection: MapDataExplorerSelection = { kind: "path", groupId: path.groupId };
            const isSelected = isMapDataExplorerSelectionEqual(selection, rowSelection);
            return (
              <tr
                key={path.groupId}
                className={selectRowClass(isSelected)}
                onClick={() => selectRow(rowSelection)}
                data-test={`data-explorer-path-${path.groupId}`}
              >
                <td>
                  <span
                    className="inline-block size-2.5 rounded-full"
                    style={{ backgroundColor: segmentGroupColor(path.groupId) }}
                  />
                </td>
                <td className="font-mono text-xs">{path.groupId}</td>
                <td>{path.name ?? "—"}</td>
                <td>{path.segmentCount}</td>
                <td>{path.pointCount}</td>
                <td>{path.pathKind}</td>
              </tr>
            );
          })}
        </tbody>
      </ExplorerTable>
    );
  }

  return (
    <ExplorerTable
      isEmpty={mapLinks.length === 0}
      emptyMessage={t("maps.workspace.dataExplorer.emptyLinks")}
    >
      <thead>
        <tr className="text-base-content/50">
          <th>ID</th>
          <th>{t("maps.workspace.dataExplorer.from")}</th>
          <th>{t("maps.workspace.dataExplorer.to")}</th>
          <th>{t("maps.workspace.dataExplorer.pathGroup")}</th>
        </tr>
      </thead>
      <tbody>
        {mapLinks.map((link) => {
          const rowSelection: MapDataExplorerSelection = { kind: "link", id: link.id };
          const isSelected = isMapDataExplorerSelectionEqual(selection, rowSelection);
          return (
            <tr
              key={link.id}
              className={selectRowClass(isSelected)}
              onClick={() => selectRow(rowSelection)}
              data-test={`data-explorer-link-${link.id}`}
            >
              <td className="font-mono text-xs">{link.id}</td>
              <td className="font-mono text-xs">{link.fromRef}</td>
              <td className="font-mono text-xs">{link.toRef}</td>
              <td className="font-mono text-xs">{link.pathSlug}</td>
            </tr>
          );
        })}
      </tbody>
    </ExplorerTable>
  );
}
