import { useState } from "react";
import { Link2, MapPin, Route, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useIpcMutation } from "@renderer/hooks/useIpc";
import { groupSegmentsByPath } from "@renderer/features/maps/lib/group-segments-by-path";
import { useGeoSegmentsQuery } from "@renderer/features/maps/hooks/useGeoSegmentsQuery";
import { useMapLinksQuery } from "@renderer/features/maps/hooks/useMapLinksQuery";
import { useMapPointsQuery } from "@renderer/features/maps/hooks/useMapPointsQuery";
import { useMapWorkspaceUiActions } from "@renderer/features/maps/store/MapWorkspaceProvider";

type MapMarkersSectionProps = {
  mapId: number;
};

export function MapMarkersSection({ mapId }: MapMarkersSectionProps) {
  const { t } = useTranslation();
  const pointsQuery = useMapPointsQuery(mapId);
  const linksQuery = useMapLinksQuery(mapId);
  const geoSegmentsQuery = useGeoSegmentsQuery(mapId);
  const deletePoint = useIpcMutation("mapPoints:delete");
  const deleteLink = useIpcMutation("mapLinks:delete");
  const previewBuild = useIpcMutation("segments:previewBuildFromPath");
  const buildSegments = useIpcMutation("segments:buildFromPath");
  const { closeControls, setDetailPanelMapPointId, setStatusMessage } = useMapWorkspaceUiActions();

  const points = pointsQuery.data?.points ?? [];
  const links = linksQuery.data?.links ?? [];
  const pathGroups = groupSegmentsByPath(geoSegmentsQuery.data?.segments ?? []);
  const [selectedPathSlug, setSelectedPathSlug] = useState("");
  const [buildMessage, setBuildMessage] = useState<string | null>(null);

  const pathSlug = selectedPathSlug || pathGroups[0]?.groupId || "";

  async function handlePreviewBuild() {
    if (!pathSlug) {
      setBuildMessage(t("maps.workspace.buildSegmentsNoPaths"));
      return;
    }
    setBuildMessage(null);
    try {
      const preview = await previewBuild.mutateAsync({
        mapId,
        pathSlug,
        maxProjectionDistanceMeters: 40,
      });
      if (preview.proposed.length === 0) {
        setBuildMessage(t("maps.workspace.buildSegmentsEmpty"));
        return;
      }
      setBuildMessage(
        `${preview.proposed.length} segment(s): ${preview.proposed.map((edge) => `${edge.fromRef}→${edge.toRef}`).join(", ")}`,
      );
    } catch (caught: unknown) {
      setBuildMessage(caught instanceof Error ? caught.message : String(caught));
    }
  }

  async function handleBuildSegments() {
    if (!pathSlug) {
      setBuildMessage(t("maps.workspace.buildSegmentsNoPaths"));
      return;
    }
    setBuildMessage(null);
    try {
      const result = await buildSegments.mutateAsync({
        mapId,
        pathSlug,
        replaceExisting: true,
        maxProjectionDistanceMeters: 40,
      });
      if (result.created.length === 0) {
        setBuildMessage(t("maps.workspace.buildSegmentsEmpty"));
        return;
      }
      setBuildMessage(
        t("maps.workspace.buildSegmentsSuccess", {
          count: result.created.length,
          path: pathSlug,
        }),
      );
      setStatusMessage(
        t("maps.workspace.buildSegmentsSuccess", {
          count: result.created.length,
          path: pathSlug,
        }),
      );
    } catch (caught: unknown) {
      setBuildMessage(caught instanceof Error ? caught.message : String(caught));
    }
  }

  return (
    <section className="flex flex-col gap-5 rounded-box bg-base-200/40 p-6">
      <div className="space-y-1.5">
        <h3 className="text-sm font-semibold tracking-tight">Markers &amp; segments</h3>
        <p className="text-sm text-base-content/55">
          Routing markers (pin tool) join into path segments. Green numbered circles are reference
          points for PDF alignment—not used here.
        </p>
      </div>

      <div className="space-y-3 rounded-box border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Route className="size-4 text-primary" />
          {t("maps.workspace.buildSegmentsTitle")}
        </div>
        <p className="text-xs text-base-content/60">{t("maps.workspace.buildSegmentsHint")}</p>
        {pathGroups.length === 0 ? (
          <p className="text-sm text-base-content/60">{t("maps.workspace.buildSegmentsNoPaths")}</p>
        ) : (
          <>
            <label className="form-control gap-1">
              <span className="label-text text-xs">{t("maps.workspace.buildSegmentsPath")}</span>
              <select
                className="select-bordered select w-full select-sm font-mono"
                value={pathSlug}
                onChange={(event) => setSelectedPathSlug(event.target.value)}
                data-test="build-segments-path-select"
              >
                {pathGroups.map((path) => (
                  <option key={path.groupId} value={path.groupId}>
                    {path.groupId}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={previewBuild.isPending || !pathSlug}
                onClick={() => void handlePreviewBuild()}
                data-test="build-segments-preview"
              >
                {t("maps.workspace.buildSegmentsPreview")}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={buildSegments.isPending || !pathSlug}
                onClick={() => void handleBuildSegments()}
                data-test="build-segments-run"
              >
                {t("maps.workspace.buildSegmentsRun")}
              </button>
            </div>
          </>
        )}
        {buildMessage ? (
          <p className="text-xs text-base-content/70" data-test="build-segments-message">
            {buildMessage}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-base-content/50 uppercase">
          Routing markers ({points.length})
        </p>
        {points.length === 0 ? (
          <p className="rounded-box bg-base-100/40 px-4 py-3 text-sm text-base-content/60">
            No routing markers yet. Use the pin tool in the map toolbar.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {points.map((point) => (
              <li
                key={point.id}
                className="flex items-center gap-2 rounded-box bg-base-100/50 px-3 py-2"
              >
                <MapPin className="size-3.5 shrink-0 text-base-content/40" />
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  onClick={() => {
                    setDetailPanelMapPointId(point.id);
                    closeControls();
                  }}
                >
                  <span className="truncate text-sm font-medium">
                    {point.ref ?? point.name ?? `Marker #${point.id}`}
                  </span>
                  <span className="shrink-0 rounded-full bg-base-content/10 px-1.5 py-0.5 text-[10px] text-base-content/60">
                    {point.category}
                    {point.nodeRole ? ` · ${point.nodeRole}` : ""}
                  </span>
                </button>
                <button
                  type="button"
                  className="btn btn-square text-error btn-ghost btn-xs"
                  aria-label="Delete marker"
                  disabled={deletePoint.isPending}
                  onClick={() => void deletePoint.mutateAsync({ mapId, pointId: point.id })}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-base-content/50 uppercase">
          Path segments ({links.length})
        </p>
        {links.length === 0 ? (
          <p className="rounded-box bg-base-100/40 px-4 py-3 text-sm text-base-content/60">
            No segments yet. Build from markers above or link two markers with the chain tool.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {links.map((link) => (
              <li
                key={link.id}
                className="flex items-center gap-2 rounded-box bg-base-100/50 px-3 py-2"
              >
                <Link2 className="size-3.5 shrink-0 text-base-content/40" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">
                    {link.fromRef} → {link.toRef}
                  </span>
                  <span className="truncate font-mono text-[11px] text-base-content/50">
                    {link.pathSlug}
                    {link.lengthM !== null ? ` · ${Math.round(link.lengthM)} m` : ""}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-square text-error btn-ghost btn-xs"
                  aria-label="Delete segment"
                  disabled={deleteLink.isPending}
                  onClick={() => void deleteLink.mutateAsync({ mapId, linkId: link.id })}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
