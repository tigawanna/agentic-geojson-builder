import type { ReactNode } from "react";
import { MapPin, Route } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ControlPointRecord } from "@shared/control-points.types";
import type { GeoSegmentRecord } from "@shared/geo-segments.types";
import type { MapLinkRecord } from "@shared/map-links.types";
import type { MapPointRecord } from "@shared/map-points.types";
import { formatMapCoordinates } from "@renderer/features/maps/lib/copy-map-coordinates";
import { groupSegmentsByPath } from "@renderer/features/maps/lib/group-segments-by-path";
import { segmentGroupColor } from "@renderer/features/maps/lib/segment-utils";
import type { MapDataExplorerSelection } from "@renderer/features/maps/types/map-data-explorer.types";

type MapDataExplorerPreviewPanelProps = {
  selection: MapDataExplorerSelection | null;
  controlPoints: ControlPointRecord[];
  mapPoints: MapPointRecord[];
  geoSegments: GeoSegmentRecord[];
  mapLinks: MapLinkRecord[];
};

function PreviewSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
        {title}
      </h4>
      {children}
    </section>
  );
}

function CoordinateRow({
  label,
  latitude,
  longitude,
}: {
  label: string;
  latitude: number;
  longitude: number;
}) {
  return (
    <div className="rounded-lg border border-base-content/10 bg-base-200/40 px-3 py-2">
      <p className="text-xs text-base-content/55">{label}</p>
      <p className="mt-0.5 font-mono text-xs">{formatMapCoordinates(latitude, longitude)}</p>
    </div>
  );
}

export function MapDataExplorerPreviewPanel({
  selection,
  controlPoints,
  mapPoints,
  geoSegments,
  mapLinks,
}: MapDataExplorerPreviewPanelProps) {
  const { t } = useTranslation();

  if (!selection) {
    return (
      <aside className="flex w-72 shrink-0 flex-col border-l border-base-content/10 bg-base-200/20 p-4">
        <p className="text-sm text-base-content/55">
          {t("maps.workspace.dataExplorer.previewEmpty")}
        </p>
      </aside>
    );
  }

  if (selection.kind === "control-point") {
    const point = controlPoints.find((entry) => entry.id === selection.id);
    if (!point) {
      return null;
    }
    return (
      <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l border-base-content/10 bg-base-200/20 p-4">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">
            {point.label ?? t("maps.workspace.dataExplorer.referencePoint", { id: point.id })}
          </h3>
        </div>
        <CoordinateRow
          label={t("maps.workspace.dataExplorer.mapLocation")}
          latitude={point.latitude}
          longitude={point.longitude}
        />
        <PreviewSection title={t("maps.workspace.dataExplorer.details")}>
          <dl className="space-y-1 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-base-content/55">ID</dt>
              <dd className="font-mono">{point.id}</dd>
            </div>
            {point.poleNumber ? (
              <div className="flex justify-between gap-2">
                <dt className="text-base-content/55">{t("maps.workspace.dataExplorer.pole")}</dt>
                <dd>{point.poleNumber}</dd>
              </div>
            ) : null}
          </dl>
        </PreviewSection>
        <p className="text-xs text-base-content/50">
          {t("maps.workspace.dataExplorer.pointMapHint")}
        </p>
      </aside>
    );
  }

  if (selection.kind === "map-point") {
    const point = mapPoints.find((entry) => entry.id === selection.id);
    if (!point) {
      return null;
    }
    return (
      <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l border-base-content/10 bg-base-200/20 p-4">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-secondary" />
          <h3 className="text-sm font-semibold">{point.name ?? point.ref ?? `#${point.id}`}</h3>
        </div>
        <CoordinateRow
          label={t("maps.workspace.dataExplorer.mapLocation")}
          latitude={point.latitude}
          longitude={point.longitude}
        />
        <PreviewSection title={t("maps.workspace.dataExplorer.details")}>
          <dl className="space-y-1 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-base-content/55">ID</dt>
              <dd className="font-mono">{point.id}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-base-content/55">{t("maps.workspace.dataExplorer.category")}</dt>
              <dd>{point.category}</dd>
            </div>
            {point.ref ? (
              <div className="flex justify-between gap-2">
                <dt className="text-base-content/55">ref</dt>
                <dd className="font-mono">{point.ref}</dd>
              </div>
            ) : null}
          </dl>
        </PreviewSection>
        <p className="text-xs text-base-content/50">
          {t("maps.workspace.dataExplorer.pointMapHint")}
        </p>
      </aside>
    );
  }

  if (selection.kind === "segment") {
    const segment = geoSegments.find((entry) => entry.id === selection.id);
    if (!segment) {
      return null;
    }
    const coordinates = segment.geometry.coordinates;
    return (
      <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l border-base-content/10 bg-base-200/20 p-4">
        <div className="flex items-center gap-2">
          <span
            className="inline-block size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: segmentGroupColor(segment.segmentGroupId) }}
          />
          <h3 className="min-w-0 truncate text-sm font-semibold">
            {segment.name ?? `${segment.segmentGroupId} #${segment.segmentIndex + 1}`}
          </h3>
        </div>
        <PreviewSection title={t("maps.workspace.dataExplorer.segmentVertices")}>
          <p className="text-xs text-base-content/60">
            {t("maps.workspace.dataExplorer.vertexCount", { count: coordinates.length })}
          </p>
          <ol className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-base-content/10 bg-base-100/60 p-2">
            {coordinates.map(([longitude, latitude], index) => (
              <li
                key={`${segment.id}-${index}`}
                className="font-mono text-[11px] text-base-content/75"
              >
                {index + 1}. {formatMapCoordinates(latitude, longitude)}
              </li>
            ))}
          </ol>
        </PreviewSection>
        <p className="text-xs text-base-content/50">
          {t("maps.workspace.dataExplorer.segmentMapHint")}
        </p>
      </aside>
    );
  }

  if (selection.kind === "path") {
    const pathGroups = groupSegmentsByPath(geoSegments);
    const path = pathGroups.find((entry) => entry.groupId === selection.groupId);
    const pathSegments = geoSegments
      .filter((segment) => segment.segmentGroupId === selection.groupId)
      .sort((a, b) => a.segmentIndex - b.segmentIndex);
    if (!path) {
      return null;
    }
    return (
      <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l border-base-content/10 bg-base-200/20 p-4">
        <div className="flex items-center gap-2">
          <Route className="size-4 text-primary" />
          <h3 className="min-w-0 truncate text-sm font-semibold">{path.name ?? path.groupId}</h3>
        </div>
        <PreviewSection title={t("maps.workspace.dataExplorer.pathSummary")}>
          <dl className="space-y-1 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-base-content/55">{t("maps.workspace.dataExplorer.pathGroup")}</dt>
              <dd className="font-mono">{path.groupId}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-base-content/55">{t("maps.workspace.dataExplorer.segments")}</dt>
              <dd>{path.segmentCount}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-base-content/55">{t("maps.workspace.dataExplorer.vertices")}</dt>
              <dd>{path.pointCount}</dd>
            </div>
          </dl>
        </PreviewSection>
        <PreviewSection title={t("maps.workspace.dataExplorer.pathSegments")}>
          <ul className="space-y-1">
            {pathSegments.map((segment) => (
              <li
                key={segment.id}
                className="rounded-lg border border-base-content/10 bg-base-100/60 px-2 py-1.5 text-xs"
              >
                {segment.name ?? `#${segment.segmentIndex + 1}`} ·{" "}
                {segment.geometry.coordinates.length}{" "}
                {t("maps.workspace.dataExplorer.verticesLabel")}
              </li>
            ))}
          </ul>
        </PreviewSection>
        <p className="text-xs text-base-content/50">
          {t("maps.workspace.dataExplorer.pathMapHint")}
        </p>
      </aside>
    );
  }

  const link = mapLinks.find((entry) => entry.id === selection.id);
  if (!link) {
    return null;
  }
  const fromPoint = mapPoints.find((point) => point.ref === link.fromRef);
  const toPoint = mapPoints.find((point) => point.ref === link.toRef);

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l border-base-content/10 bg-base-200/20 p-4">
      <h3 className="text-sm font-semibold">
        {link.fromRef} → {link.toRef}
      </h3>
      <PreviewSection title={t("maps.workspace.dataExplorer.linkEndpoints")}>
        {fromPoint ? (
          <CoordinateRow
            label={link.fromRef}
            latitude={fromPoint.latitude}
            longitude={fromPoint.longitude}
          />
        ) : (
          <p className="text-xs text-base-content/55">{link.fromRef}</p>
        )}
        {toPoint ? (
          <CoordinateRow
            label={link.toRef}
            latitude={toPoint.latitude}
            longitude={toPoint.longitude}
          />
        ) : (
          <p className="text-xs text-base-content/55">{link.toRef}</p>
        )}
      </PreviewSection>
      <PreviewSection title={t("maps.workspace.dataExplorer.pathGroup")}>
        <p className="font-mono text-xs">{link.pathSlug}</p>
      </PreviewSection>
      <p className="text-xs text-base-content/50">{t("maps.workspace.dataExplorer.linkMapHint")}</p>
    </aside>
  );
}
