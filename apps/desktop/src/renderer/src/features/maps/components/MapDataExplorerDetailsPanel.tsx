import { useMemo, type ReactNode } from "react";
import { Copy, MapPin, Pencil, Route } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getElevationAtLatLng, type GeoCoordinate } from "@repo/isomorphic/elevation-at-point";
import { formatElevation } from "@renderer/features/map-playground/lib/analyze-trail-feature";
import type { ControlPointRecord } from "@shared/control-points.types";
import type { GeoSegmentRecord } from "@shared/geo-segments.types";
import type { MapLinkRecord } from "@shared/map-links.types";
import type { MapPointRecord } from "@shared/map-points.types";
import type { TrailRecord } from "@shared/trails.types";
import { MapDataExplorerElevationChart } from "@renderer/features/maps/components/MapDataExplorerElevationChart";
import { formatMapCoordinates } from "@renderer/features/maps/lib/copy-map-coordinates";
import { buildElevationProfileFromCoordinates } from "@renderer/features/maps/lib/elevation-profile";
import { groupSegmentsByPath } from "@renderer/features/maps/lib/group-segments-by-path";
import { segmentGroupColor } from "@renderer/features/maps/lib/segment-utils";
import { copyProbeText } from "@renderer/features/maps/lib/mapbox-probe-coordinates";
import { formatCoordinateTripleCopy } from "@renderer/features/maps/lib/parse-coordinate-paste";
import { useMapDataExplorerPageStore } from "@renderer/features/maps/store/map-data-explorer-page-store";
import type { MapDataExplorerSelection } from "@renderer/features/maps/types/map-data-explorer.types";

type MapDataExplorerDetailsPanelProps = {
  selection: MapDataExplorerSelection | null;
  controlPoints: ControlPointRecord[];
  mapPoints: MapPointRecord[];
  geoSegments: GeoSegmentRecord[];
  mapLinks: MapLinkRecord[];
  trails: TrailRecord[];
  onEdit: () => void;
};

function DetailActions({
  onEdit,
  onCopy,
  showEdit,
}: {
  onEdit: () => void;
  onCopy?: () => void;
  showEdit: boolean;
}) {
  const { t } = useTranslation();
  if (!showEdit && !onCopy) {
    return null;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {showEdit ? (
        <button type="button" className="btn gap-1 btn-xs btn-primary" onClick={onEdit}>
          <Pencil className="size-3" />
          {t("maps.workspace.dataExplorer.edit.open")}
        </button>
      ) : null}
      {onCopy ? (
        <button type="button" className="btn gap-1 btn-ghost btn-xs" onClick={onCopy}>
          <Copy className="size-3" />
          {t("maps.workspace.dataExplorer.edit.copyCoordinates")}
        </button>
      ) : null}
    </div>
  );
}

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

export function MapDataExplorerDetailsPanel({
  selection,
  controlPoints,
  mapPoints,
  geoSegments,
  mapLinks,
  trails,
  onEdit,
}: MapDataExplorerDetailsPanelProps) {
  const { t } = useTranslation();
  const setStatusMessage = useMapDataExplorerPageStore((state) => state.setStatusMessage);

  function copyCoordinatesText(latitude: number, longitude: number, altitudeM: number | null) {
    const text = formatCoordinateTripleCopy(latitude, longitude, altitudeM);
    void copyProbeText(text).then(() => {
      setStatusMessage(t("maps.workspace.dataExplorer.inspect.copied", { value: text }));
    });
  }

  const elevationProfile = useMemo(() => {
    if (!selection) {
      return null;
    }
    if (selection.kind === "segment") {
      const segment = geoSegments.find((entry) => entry.id === selection.id);
      if (!segment) {
        return null;
      }
      return buildElevationProfileFromCoordinates(
        segment.geometry.coordinates.map(([longitude, latitude]) => ({ latitude, longitude })),
      );
    }
    if (selection.kind === "path") {
      const pathSegments = geoSegments
        .filter((segment) => segment.segmentGroupId === selection.groupId)
        .sort((a, b) => a.segmentIndex - b.segmentIndex);
      const coordinates = pathSegments.flatMap((segment) =>
        segment.geometry.coordinates.map(([longitude, latitude]) => ({ latitude, longitude })),
      );
      return buildElevationProfileFromCoordinates(coordinates);
    }
    return null;
  }, [geoSegments, selection]);

  if (!selection) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-center text-sm text-base-content/55">
          {t("maps.workspace.dataExplorer.previewEmpty")}
        </p>
      </div>
    );
  }

  if (selection.kind === "control-point") {
    const point = controlPoints.find((entry) => entry.id === selection.id);
    if (!point) {
      return null;
    }
    return (
      <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-primary" />
          <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">
            {point.label ?? t("maps.workspace.dataExplorer.referencePoint", { id: point.id })}
          </h3>
        </div>
        <DetailActions
          showEdit
          onEdit={onEdit}
          onCopy={() => copyCoordinatesText(point.latitude, point.longitude, point.altitudeM)}
        />
        <CoordinateRow
          label={t("maps.workspace.dataExplorer.mapLocation")}
          latitude={point.latitude}
          longitude={point.longitude}
        />
        {point.altitudeM !== null ? (
          <PreviewSection title={t("maps.workspace.dataExplorer.altitude")}>
            <p className="text-lg font-semibold tabular-nums">{formatElevation(point.altitudeM)}</p>
          </PreviewSection>
        ) : null}
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
      </div>
    );
  }

  if (selection.kind === "map-point") {
    const point = mapPoints.find((entry) => entry.id === selection.id);
    if (!point) {
      return null;
    }
    return (
      <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-secondary" />
          <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">
            {point.name ?? point.ref ?? `#${point.id}`}
          </h3>
        </div>
        <DetailActions
          showEdit
          onEdit={onEdit}
          onCopy={() => copyCoordinatesText(point.latitude, point.longitude, point.elevation)}
        />
        <CoordinateRow
          label={t("maps.workspace.dataExplorer.mapLocation")}
          latitude={point.latitude}
          longitude={point.longitude}
        />
        {point.elevation !== null ? (
          <PreviewSection title={t("maps.workspace.dataExplorer.altitude")}>
            <p className="text-lg font-semibold tabular-nums">{formatElevation(point.elevation)}</p>
          </PreviewSection>
        ) : null}
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
            {point.nodeRole ? (
              <div className="flex justify-between gap-2">
                <dt className="text-base-content/55">
                  {t("maps.workspace.dataExplorer.nodeRole")}
                </dt>
                <dd>{point.nodeRole}</dd>
              </div>
            ) : null}
            {point.ref ? (
              <div className="flex justify-between gap-2">
                <dt className="text-base-content/55">ref</dt>
                <dd className="font-mono">{point.ref}</dd>
              </div>
            ) : null}
          </dl>
        </PreviewSection>
      </div>
    );
  }

  if (selection.kind === "segment") {
    const segment = geoSegments.find((entry) => entry.id === selection.id);
    if (!segment) {
      return null;
    }
    const coordinates = segment.geometry.coordinates;
    const midpoint = coordinates[Math.floor(coordinates.length / 2)];
    const midpointLatitude = midpoint?.[1] ?? 0;
    const midpointLongitude = midpoint?.[0] ?? 0;
    const midpointAltitude = getElevationAtLatLng(
      coordinates as GeoCoordinate[],
      midpointLatitude,
      midpointLongitude,
    );
    return (
      <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
        <div className="flex items-center gap-2">
          <span
            className="inline-block size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: segmentGroupColor(segment.segmentGroupId) }}
          />
          <h3 className="min-w-0 truncate text-sm font-semibold">
            {segment.name ?? `${segment.segmentGroupId} #${segment.segmentIndex + 1}`}
          </h3>
        </div>
        <DetailActions
          showEdit={false}
          onEdit={onEdit}
          onCopy={() => copyCoordinatesText(midpointLatitude, midpointLongitude, midpointAltitude)}
        />
        {elevationProfile ? <MapDataExplorerElevationChart profile={elevationProfile} /> : null}
        <PreviewSection title={t("maps.workspace.dataExplorer.segmentVertices")}>
          <p className="text-xs text-base-content/60">
            {t("maps.workspace.dataExplorer.vertexCount", { count: coordinates.length })}
          </p>
        </PreviewSection>
      </div>
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
      <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
        <div className="flex items-center gap-2">
          <Route className="size-4 text-primary" />
          <h3 className="min-w-0 truncate text-sm font-semibold">{path.name ?? path.groupId}</h3>
        </div>
        {elevationProfile ? <MapDataExplorerElevationChart profile={elevationProfile} /> : null}
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
      </div>
    );
  }

  if (selection.kind === "trail") {
    const trail = trails.find((entry) => entry.id === selection.id);
    if (!trail) {
      return null;
    }
    return (
      <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
        <h3 className="text-sm font-semibold">{trail.name ?? trail.slug}</h3>
        <PreviewSection title={t("maps.workspace.dataExplorer.trailMembers")}>
          {trail.members.length === 0 ? (
            <p className="text-xs text-base-content/55">
              {t("maps.workspace.dataExplorer.emptyTrailMembers")}
            </p>
          ) : (
            <ul className="space-y-1 text-xs">
              {trail.members.map((member) => (
                <li
                  key={member.id}
                  className="rounded-lg border border-base-content/10 bg-base-100/60 px-2 py-1.5 font-mono"
                >
                  #{member.orderIndex} · edge {member.segmentEdgeId} · {member.direction}
                </li>
              ))}
            </ul>
          )}
        </PreviewSection>
      </div>
    );
  }

  if (selection.kind !== "link") {
    return null;
  }

  const link = mapLinks.find((entry) => entry.id === selection.id);
  if (!link) {
    return null;
  }
  const fromPoint = mapPoints.find((point) => point.ref === link.fromRef);
  const toPoint = mapPoints.find((point) => point.ref === link.toRef);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
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
        {link.lengthM !== null ? (
          <p className="mt-1 text-xs text-base-content/60">{Math.round(link.lengthM)} m</p>
        ) : null}
      </PreviewSection>
    </div>
  );
}
