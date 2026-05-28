import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useIpcEvent } from "@renderer/hooks/useIpcEvent";
import { useCreateMapMutation } from "@renderer/features/maps/useCreateMapMutation";
import { useMapsListQuery } from "@renderer/features/maps/useMapsListQuery";

export function MapsIpcDemo() {
  const { t } = useTranslation();
  const maps = useMapsListQuery();
  const createMap = useCreateMapMutation();
  const [name, setName] = useState("");
  const lastEvent = useIpcEvent("maps:changed");

  return (
    <section className="glass-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t("maps.demo.heading")}</h2>
          <p className="mt-1 text-sm text-base-content/60">{t("maps.demo.description")}</p>
        </div>
        {lastEvent ? (
          <span className="badge badge-outline badge-sm">
            {t("maps.demo.lastEvent", {
              reason: lastEvent.reason,
              mapId: lastEvent.mapId ?? "—",
            })}
          </span>
        ) : null}
      </div>

      <form
        className="mt-4 flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          createMap.mutate({ name: name.trim() || undefined });
          setName("");
        }}
      >
        <input
          className="input-bordered input input-sm min-w-48 flex-1"
          placeholder={t("maps.demo.namePlaceholder")}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button type="submit" className="btn btn-sm btn-primary" disabled={createMap.isPending}>
          {createMap.isPending ? t("maps.demo.creating") : t("maps.demo.create")}
        </button>
      </form>

      {createMap.isError ? <p className="mt-3 text-sm text-error">{t("maps.demo.error")}</p> : null}

      <div className="mt-4">
        {maps.isLoading ? (
          <p className="text-sm text-base-content/60">{t("maps.demo.loading")}</p>
        ) : maps.isError ? (
          <p className="text-sm text-error">{t("maps.demo.loadError")}</p>
        ) : maps.data?.length ? (
          <ul className="divide-y divide-base-content/10 rounded-box border border-base-content/10">
            {maps.data.map((map) => (
              <li
                key={map.id}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <span className="font-medium">{map.name}</span>
                <span className="font-mono text-xs text-base-content/50">
                  #{map.id}
                  {map.id < 0 ? ` · ${t("maps.demo.optimistic")}` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-base-content/60">{t("maps.demo.empty")}</p>
        )}
      </div>

      <ol className="mt-4 list-decimal space-y-1 pl-5 text-xs text-base-content/50">
        <li>{t("maps.demo.flow.mutate")}</li>
        <li>{t("maps.demo.flow.invoke")}</li>
        <li>{t("maps.demo.flow.persist")}</li>
        <li>{t("maps.demo.flow.emit")}</li>
        <li>{t("maps.demo.flow.invalidate")}</li>
      </ol>
    </section>
  );
}
