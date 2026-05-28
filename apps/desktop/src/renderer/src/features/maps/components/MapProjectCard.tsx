import { Link } from "@tanstack/react-router";
import { MapIcon, MoreVertical } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MapListItem } from "@shared/maps.types";
import { useMapThumbnailQuery } from "@renderer/features/maps/hooks/useMapThumbnailQuery";

type MapProjectCardProps = {
  map: MapListItem;
};

async function openNativeContextMenu(map: MapListItem, event?: React.MouseEvent) {
  event?.preventDefault();
  event?.stopPropagation();
  await window.api.invoke("app:showMapContextMenu", {
    mapId: map.id,
    mapName: map.name,
  });
}

export function MapProjectCard({ map }: MapProjectCardProps) {
  const { t } = useTranslation();
  const thumbnail = useMapThumbnailQuery(map.id, map.hasThumbnail);

  return (
    <article
      className="glass-card group flex aspect-[3/4] flex-col overflow-hidden transition-shadow hover:shadow-lg"
      data-test={`map-card-${map.id}`}
      onContextMenu={(event) => void openNativeContextMenu(map, event)}
    >
      <Link
        to="/maps/$mapId"
        params={{ mapId: String(map.id) }}
        className="relative block min-h-0 flex-[7] overflow-hidden bg-base-200/40"
      >
        {thumbnail.data ? (
          <img
            src={thumbnail.data}
            alt=""
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex size-full min-h-0 items-center justify-center bg-base-200/60">
            <MapIcon className="size-10 text-base-content/20" aria-hidden />
          </div>
        )}
      </Link>

      <div className="flex min-h-0 flex-[3] items-start justify-between gap-2 px-4 py-3">
        <Link
          to="/maps/$mapId"
          params={{ mapId: String(map.id) }}
          className="min-w-0 flex-1 hover:underline"
        >
          <h3 className="truncate font-medium">{map.name}</h3>
          {map.locationQuery ? (
            <p className="mt-0.5 truncate text-xs text-base-content/50">{map.locationQuery}</p>
          ) : null}
        </Link>

        <button
          type="button"
          className="btn btn-square shrink-0 btn-ghost btn-xs"
          aria-label={t("maps.list.actions")}
          data-test={`map-actions-${map.id}`}
          onClick={(event) => void openNativeContextMenu(map, event)}
        >
          <MoreVertical className="size-4" />
        </button>
      </div>
    </article>
  );
}
