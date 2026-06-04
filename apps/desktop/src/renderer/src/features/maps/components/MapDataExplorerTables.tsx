import { Fragment, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@renderer/lib/utils";
import { AuditLogPanel } from "@renderer/features/audit-log/components/AuditLogPanel";
import { groupSegmentsByPath } from "@renderer/features/maps/lib/group-segments-by-path";
import { segmentGroupColor } from "@renderer/features/maps/lib/segment-utils";
import { isMapDataExplorerSelectionEqual } from "@renderer/features/maps/hooks/useMapDataExplorerFocus";
import { useMapDataExplorerPageStore } from "@renderer/features/maps/store/map-data-explorer-page-store";
import type { MapDataExplorerSelection } from "@renderer/features/maps/types/map-data-explorer.types";
import { MapDataExplorerBuildSegmentsPanel } from "@renderer/features/maps/components/MapDataExplorerBuildSegmentsPanel";
import { MapDataExplorerCreateTrailForm } from "@renderer/features/maps/components/MapDataExplorerCreateTrailForm";
import { MapDataExplorerRoutePanel } from "@renderer/features/maps/components/MapDataExplorerRoutePanel";
import { MapPointsExplorerTable } from "@renderer/features/maps/components/MapPointsExplorerTable";
import type { GeoSegmentRecord } from "@shared/geo-segments.types";
import type { MapLinkRecord } from "@shared/map-links.types";
import type { MapPointRecord } from "@shared/map-points.types";
import type { TrailRecord } from "@shared/trails.types";

type MapDataExplorerTablesProps = {
  mapId: number;
  mapPoints: MapPointRecord[];
  geoSegments: GeoSegmentRecord[];
  mapLinks: MapLinkRecord[];
  trails: TrailRecord[];
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
  mapPoints,
  geoSegments,
  mapLinks,
  trails,
}: MapDataExplorerTablesProps) {
  const { t } = useTranslation();
  const tab = useMapDataExplorerPageStore((state) => state.tab);
  const selection = useMapDataExplorerPageStore((state) => state.selection);
  const setSelection = useMapDataExplorerPageStore((state) => state.setSelection);
  const pathGroups = groupSegmentsByPath(geoSegments);

  function selectRow(next: MapDataExplorerSelection | null) {
    if (next === null) {
      setSelection(null);
      return;
    }
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
      <MapPointsExplorerTable
        mapId={mapId}
        mapPoints={mapPoints}
        selection={selection}
        onSelectRow={selectRow}
      />
    );
  }

  if (tab === "segments") {
    return (
      <ExplorerTable
        isEmpty={pathGroups.length === 0}
        emptyMessage={t("maps.workspace.dataExplorer.emptySegments")}
      >
        <thead>
          <tr className="text-base-content/50">
            <th />
            <th>{t("maps.workspace.dataExplorer.name")}</th>
            <th>{t("maps.workspace.dataExplorer.segments")}</th>
            <th>{t("maps.workspace.dataExplorer.vertices")}</th>
            <th>{t("maps.workspace.dataExplorer.kind")}</th>
            <th>{t("maps.workspace.dataExplorer.status")}</th>
          </tr>
        </thead>
        <tbody>
          {pathGroups.map((path) => {
            const pathSelection: MapDataExplorerSelection = { kind: "path", groupId: path.groupId };
            const isPathSelected = isMapDataExplorerSelectionEqual(selection, pathSelection);
            const pathSegments = geoSegments
              .filter((segment) => segment.segmentGroupId === path.groupId)
              .sort((left, right) => left.segmentIndex - right.segmentIndex);

            return (
              <Fragment key={path.groupId}>
                <tr
                  className={cn(selectRowClass(isPathSelected), "bg-base-200/40 font-medium")}
                  onClick={() => selectRow(pathSelection)}
                  data-test={`data-explorer-path-${path.groupId}`}
                >
                  <td>
                    <span
                      className="inline-block size-2.5 rounded-full"
                      style={{ backgroundColor: segmentGroupColor(path.groupId) }}
                    />
                  </td>
                  <td>
                    <div>{path.name ?? path.groupId}</div>
                    {path.name ? (
                      <div className="font-mono text-[11px] text-base-content/45">
                        {path.groupId}
                      </div>
                    ) : null}
                  </td>
                  <td>{path.segmentCount}</td>
                  <td>{path.pointCount}</td>
                  <td>{path.pathKind}</td>
                  <td>—</td>
                </tr>
                {pathSegments.map((segment) => {
                  const rowSelection: MapDataExplorerSelection = {
                    kind: "segment",
                    id: segment.id,
                  };
                  const isSelected = isMapDataExplorerSelectionEqual(selection, rowSelection);
                  return (
                    <tr
                      key={segment.id}
                      className={cn(selectRowClass(isSelected), "text-base-content/90")}
                      onClick={() => selectRow(rowSelection)}
                      data-test={`data-explorer-segment-${segment.id}`}
                    >
                      <td className="pl-6">
                        <span
                          className="inline-block size-1.5 rounded-full opacity-70"
                          style={{ backgroundColor: segmentGroupColor(path.groupId) }}
                        />
                      </td>
                      <td>
                        <span className="font-mono text-[11px] text-base-content/45">
                          #{segment.id}
                        </span>{" "}
                        {segment.name ?? `Part ${segment.segmentIndex + 1}`}
                      </td>
                      <td className="text-base-content/50">—</td>
                      <td>{segment.geometry.coordinates.length}</td>
                      <td className="text-base-content/50">{segment.pathKind}</td>
                      <td>{segment.status}</td>
                    </tr>
                  );
                })}
              </Fragment>
            );
          })}
        </tbody>
      </ExplorerTable>
    );
  }

  if (tab === "route") {
    return <MapDataExplorerRoutePanel mapId={mapId} mapPoints={mapPoints} />;
  }

  if (tab === "trails") {
    return (
      <>
        <MapDataExplorerCreateTrailForm mapId={mapId} />
        <ExplorerTable
          isEmpty={trails.length === 0}
          emptyMessage={t("maps.workspace.dataExplorer.emptyTrails")}
        >
          <thead>
            <tr className="text-base-content/50">
              <th>ID</th>
              <th>{t("maps.workspace.dataExplorer.name")}</th>
              <th>{t("maps.workspace.dataExplorer.pathGroup")}</th>
              <th>{t("maps.workspace.dataExplorer.segments")}</th>
              <th>{t("maps.workspace.dataExplorer.status")}</th>
            </tr>
          </thead>
          <tbody>
            {trails.map((trail) => {
              const rowSelection: MapDataExplorerSelection = { kind: "trail", id: trail.id };
              const isSelected = isMapDataExplorerSelectionEqual(selection, rowSelection);
              return (
                <tr
                  key={trail.id}
                  className={selectRowClass(isSelected)}
                  onClick={() => selectRow(rowSelection)}
                  data-test={`data-explorer-trail-${trail.id}`}
                >
                  <td className="font-mono text-xs">{trail.id}</td>
                  <td>{trail.name ?? trail.slug}</td>
                  <td className="font-mono text-xs">{trail.slug}</td>
                  <td>{trail.members.length}</td>
                  <td>{trail.status}</td>
                </tr>
              );
            })}
          </tbody>
        </ExplorerTable>
      </>
    );
  }

  return (
    <>
      <MapDataExplorerBuildSegmentsPanel mapId={mapId} geoSegments={geoSegments} />
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
            <th>m</th>
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
                <td className="font-mono text-xs">
                  {link.lengthM !== null ? Math.round(link.lengthM) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </ExplorerTable>
    </>
  );
}
