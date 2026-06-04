import { Link } from "@tanstack/react-router";
import { Database, MapIcon, MoreVertical } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MapListItem } from "@shared/maps.types";
import { useMapThumbnailQuery } from "@renderer/features/maps/hooks/useMapThumbnailQuery";
import { useMapsListQuery } from "@renderer/features/maps/useMapsListQuery";

async function openNativeContextMenu(map: MapListItem, event?: React.MouseEvent) {
  event?.preventDefault();
  event?.stopPropagation();
  await window.api.invoke("app:showMapContextMenu", {
    mapId: map.id,
    mapName: map.name,
  });
}

function DataProjectCard({ map }: { map: MapListItem }) {
  const { t } = useTranslation();
  const thumbnail = useMapThumbnailQuery(map.id, map.hasThumbnail);

  return (
    <article
      className="group flex flex-col overflow-hidden rounded-2xl border border-base-content/12 bg-base-200 shadow-md transition-all hover:border-base-content/20 hover:shadow-xl"
      data-test={`data-card-${map.id}`}
      onContextMenu={(event) => void openNativeContextMenu(map, event)}
    >
      <Link
        to="/data/$mapId"
        params={{ mapId: String(map.id) }}
        className="relative block aspect-4/3 overflow-hidden bg-base-300/50"
      >
        {thumbnail.data ? (
          <img
            src={thumbnail.data}
            alt=""
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-base-300/60">
            <Database className="size-10 text-base-content/20" aria-hidden />
          </div>
        )}
      </Link>

      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <Link
          to="/data/$mapId"
          params={{ mapId: String(map.id) }}
          className="min-w-0 flex-1 hover:underline"
        >
          <h3 className="truncate text-sm font-semibold">{map.name}</h3>
          {map.locationQuery ? (
            <p className="mt-0.5 truncate text-xs text-base-content/50">{map.locationQuery}</p>
          ) : null}
        </Link>

        <button
          type="button"
          className="btn btn-square shrink-0 btn-ghost btn-xs"
          aria-label={t("maps.list.actions")}
          onClick={(event) => void openNativeContextMenu(map, event)}
        >
          <MoreVertical className="size-4" />
        </button>
      </div>
    </article>
  );
}

export function DataListPage() {
  const { t } = useTranslation();
  const maps = useMapsListQuery();

  return (
    <section className="animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-base-content/55">{t("data.list.description")}</p>
        <Link to="/maps" className="btn gap-1.5 btn-ghost btn-sm">
          <MapIcon className="size-4" />
          {t("data.list.openMaps")}
        </Link>
      </div>

      <div className="mt-6">
        {maps.isLoading ? (
          <p className="text-sm text-base-content/60">{t("data.list.loading")}</p>
        ) : maps.isError ? (
          <p className="text-sm text-error">{t("data.list.error")}</p>
        ) : maps.data?.length ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {maps.data.map((map) => (
              <DataProjectCard key={map.id} map={map} />
            ))}
          </div>
        ) : (
          <div className="rounded-box border border-dashed border-base-content/15 px-6 py-10 text-center">
            <p className="text-sm text-base-content/60">{t("data.list.empty")}</p>
          </div>
        )}
      </div>
    </section>
  );
}
