import { Link2, MapPin, Trash2 } from "lucide-react";
import { useIpcMutation } from "@renderer/hooks/useIpc";
import { useMapLinksQuery } from "@renderer/features/maps/hooks/useMapLinksQuery";
import { useMapPointsQuery } from "@renderer/features/maps/hooks/useMapPointsQuery";
import { useMapWorkspaceUiActions } from "@renderer/features/maps/store/MapWorkspaceProvider";

type MapMarkersSectionProps = {
  mapId: number;
};

export function MapMarkersSection({ mapId }: MapMarkersSectionProps) {
  const pointsQuery = useMapPointsQuery(mapId);
  const linksQuery = useMapLinksQuery(mapId);
  const deletePoint = useIpcMutation("mapPoints:delete");
  const deleteLink = useIpcMutation("mapLinks:delete");
  const { closeControls, setDetailPanelMapPointId } = useMapWorkspaceUiActions();

  const points = pointsQuery.data?.points ?? [];
  const links = linksQuery.data?.links ?? [];

  return (
    <section className="flex flex-col gap-5 rounded-box bg-base-200/40 p-6">
      <div className="space-y-1.5">
        <h3 className="text-sm font-semibold tracking-tight">Markers &amp; links</h3>
        <p className="text-sm text-base-content/55">
          Labeled points and the edges that connect them along a path. Use the Marker and Link tools
          in the toolbar to add more.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-base-content/50 uppercase">
          Markers ({points.length})
        </p>
        {points.length === 0 ? (
          <p className="rounded-box bg-base-100/40 px-4 py-3 text-sm text-base-content/60">
            No markers yet.
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
          Links ({links.length})
        </p>
        {links.length === 0 ? (
          <p className="rounded-box bg-base-100/40 px-4 py-3 text-sm text-base-content/60">
            No links yet.
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
                    {link.startFraction !== null && link.endFraction !== null
                      ? ` · ${link.startFraction.toFixed(2)}–${link.endFraction.toFixed(2)}`
                      : ""}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-square text-error btn-ghost btn-xs"
                  aria-label="Delete link"
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
