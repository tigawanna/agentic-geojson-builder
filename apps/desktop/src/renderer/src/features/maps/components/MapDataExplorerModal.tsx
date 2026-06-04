import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@renderer/lib/utils";
import { AuditLogPanel } from "@renderer/features/audit-log/components/AuditLogPanel";
import { MapDataExplorerPreviewPanel } from "@renderer/features/maps/components/MapDataExplorerPreviewPanel";
import { groupSegmentsByPath } from "@renderer/features/maps/lib/group-segments-by-path";
import { segmentGroupColor } from "@renderer/features/maps/lib/segment-utils";
import { useControlPointsQuery } from "@renderer/features/maps/hooks/useControlPointsQuery";
import { useGeoSegmentsQuery } from "@renderer/features/maps/hooks/useGeoSegmentsQuery";
import {
  isMapDataExplorerSelectionEqual,
  useMapDataExplorerFocus,
} from "@renderer/features/maps/hooks/useMapDataExplorerFocus";
import { useMapLinksQuery } from "@renderer/features/maps/hooks/useMapLinksQuery";
import { useMapPointsQuery } from "@renderer/features/maps/hooks/useMapPointsQuery";
import {
  useMapWorkspaceUiActions,
  useMapWorkspaceUiState,
} from "@renderer/features/maps/store/MapWorkspaceProvider";
import type {
  MapDataExplorerSelection,
  MapDataExplorerTab,
} from "@renderer/features/maps/types/map-data-explorer.types";

type MapDataExplorerModalProps = {
  mapId: number;
  open: boolean;
  onClose: () => void;
};

const TABS: MapDataExplorerTab[] = ["points", "segments", "paths", "links", "history"];

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

export function MapDataExplorerModal({ mapId, open, onClose }: MapDataExplorerModalProps) {
  const { t } = useTranslation();
  const tab = useMapWorkspaceUiState((state) => state.dataExplorerTab);
  const selection = useMapWorkspaceUiState((state) => state.dataExplorerSelection);
  const { setDataExplorerTab, setDataExplorerSelection } = useMapWorkspaceUiActions();

  const controlPointsQuery = useControlPointsQuery(mapId);
  const mapPointsQuery = useMapPointsQuery(mapId);
  const geoSegmentsQuery = useGeoSegmentsQuery(mapId);
  const mapLinksQuery = useMapLinksQuery(mapId);

  const controlPoints = controlPointsQuery.data?.controlPoints ?? [];
  const mapPoints = mapPointsQuery.data?.points ?? [];
  const geoSegments = geoSegmentsQuery.data?.segments ?? [];
  const mapLinks = mapLinksQuery.data?.links ?? [];
  const pathGroups = groupSegmentsByPath(geoSegments);

  useMapDataExplorerFocus({
    mapId: open ? mapId : null,
    controlPoints,
    mapPoints,
    geoSegments,
    mapLinks,
  });

  function selectRow(next: MapDataExplorerSelection) {
    if (isMapDataExplorerSelectionEqual(selection, next)) {
      setDataExplorerSelection(null);
      return;
    }
    setDataExplorerSelection(next);
  }

  if (!open) {
    return null;
  }

  return (
    <div className="modal-open modal z-1300">
      <div className="modal-box flex max-h-[90vh] w-[min(72rem,calc(100vw-2rem))] max-w-none flex-col px-0 py-0 shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-base-content/10 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold">{t("maps.workspace.dataExplorer.title")}</h3>
            <p className="mt-1 text-xs text-base-content/55">
              {t("maps.workspace.dataExplorer.subtitle")}
            </p>
          </div>
          <button type="button" className="btn btn-square btn-ghost btn-sm" onClick={onClose}>
            <X className="size-4" />
          </button>
        </div>

        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-base-content/10 px-4">
          {TABS.map((entry) => (
            <button
              key={entry}
              type="button"
              className={cn(
                "shrink-0 rounded-t-lg px-3 py-2 text-sm font-medium transition-colors",
                tab === entry
                  ? "bg-base-100 text-primary"
                  : "text-base-content/60 hover:bg-base-200/50 hover:text-base-content",
              )}
              onClick={() => setDataExplorerTab(entry)}
              data-test={`data-explorer-tab-${entry}`}
            >
              {t(`maps.workspace.dataExplorer.tabs.${entry}`)}
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4">
            {tab === "points" ? (
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
                            <td>{point.category}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </ExplorerTable>
                </section>
              </div>
            ) : null}

            {tab === "segments" ? (
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
                    const rowSelection: MapDataExplorerSelection = {
                      kind: "segment",
                      id: segment.id,
                    };
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
                        <td>
                          {segment.name ?? `${segment.segmentGroupId} #${segment.segmentIndex + 1}`}
                        </td>
                        <td className="font-mono text-xs">{segment.segmentGroupId}</td>
                        <td>{segment.geometry.coordinates.length}</td>
                        <td>{segment.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </ExplorerTable>
            ) : null}

            {tab === "paths" ? (
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
                    const rowSelection: MapDataExplorerSelection = {
                      kind: "path",
                      groupId: path.groupId,
                    };
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
            ) : null}

            {tab === "links" ? (
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
            ) : null}

            {tab === "history" ? (
              <AuditLogPanel mapId={mapId} fillHeight className="min-h-[20rem]" />
            ) : null}
          </div>

          {tab !== "history" ? (
            <MapDataExplorerPreviewPanel
              selection={selection}
              controlPoints={controlPoints}
              mapPoints={mapPoints}
              geoSegments={geoSegments}
              mapLinks={mapLinks}
            />
          ) : null}
        </div>
      </div>
      <button type="button" className="modal-backdrop" onClick={onClose} aria-hidden />
    </div>
  );
}
