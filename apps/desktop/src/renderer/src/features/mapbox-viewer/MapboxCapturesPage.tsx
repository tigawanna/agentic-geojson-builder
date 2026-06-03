import { MapboxCaptureMiniMap } from "@renderer/features/mapbox-viewer/components/MapboxCaptureMiniMap";
import { MapboxProbeCoordinatesSection } from "@renderer/features/mapbox-viewer/components/MapboxProbeCoordinatesSection";
import { useMapboxCapturesQuery } from "@renderer/features/mapbox-viewer/hooks/useMapboxCapturesQuery";
import type { MapboxGlStyleId } from "@renderer/features/mapbox-viewer/lib/mapbox-styles";
import {
  copyProbeText,
  formatProbeCoordinatesGeoJson,
} from "@renderer/features/mapbox-viewer/lib/mapbox-probe-coordinates";
import { useMapboxTokenQuery } from "@renderer/features/maps/hooks/useMapboxToken";
import { useIpcMutation } from "@renderer/hooks/useIpc";
import { Link } from "@tanstack/react-router";
import type { MapboxGroundCaptureRecord } from "@shared/mapbox-capture.types";
import { ArrowLeft, Check, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

function captureStyleId(capture: MapboxGroundCaptureRecord): MapboxGlStyleId {
  const style = capture.baseMapStyle;
  if (
    style === "outdoors" ||
    style === "satellite-streets" ||
    style === "streets" ||
    style === "light" ||
    style === "dark"
  ) {
    return style;
  }
  return "outdoors";
}

export function MapboxCapturesPage() {
  const { t } = useTranslation();
  const token = useMapboxTokenQuery().data ?? null;
  const capturesQuery = useMapboxCapturesQuery();
  const updateCapture = useIpcMutation("mapboxCaptures:update");
  const deleteCapture = useIpcMutation("mapboxCaptures:delete");

  const captures = capturesQuery.data?.captures ?? [];
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const selected = captures.find((capture) => capture.id === selectedId) ?? null;

  useEffect(() => {
    if (captures.length === 0) {
      setSelectedId(null);
      return;
    }
    if (selectedId !== null && captures.some((capture) => capture.id === selectedId)) {
      return;
    }
    setSelectedId(captures[0]?.id ?? null);
  }, [captures, selectedId]);

  return (
    <div
      data-test="mapbox-captures-page"
      className="flex h-full min-h-0 flex-col gap-4 lg:flex-row"
    >
      <aside className="flex w-full shrink-0 flex-col gap-3 lg:w-80">
        <div className="flex items-center gap-2">
          <Link to="/mapbox" className="btn btn-square btn-ghost btn-sm">
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold">{t("mapboxViewer.collectionTitle")}</h1>
            <p className="text-xs text-base-content/60">
              {t("mapboxViewer.collectionCount", { count: captures.length })}
            </p>
          </div>
        </div>

        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto rounded-xl border border-base-300 bg-base-100/50 p-2">
          {captures.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-base-content/60">
              {t("mapboxViewer.collectionEmpty")}
            </li>
          ) : (
            captures.map((capture) => (
              <li key={capture.id}>
                <button
                  type="button"
                  className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                    selectedId === capture.id
                      ? "bg-primary/15 ring-1 ring-primary/40"
                      : "hover:bg-base-200/80"
                  }`}
                  onClick={() => setSelectedId(capture.id)}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`size-2 shrink-0 rounded-full ${capture.approved ? "bg-success" : "bg-warning"}`}
                    />
                    <span className="truncate text-sm font-medium">{capture.title}</span>
                  </div>
                  <p className="mt-0.5 truncate pl-4 font-mono text-[11px] text-base-content/55">
                    {capture.latitude.toFixed(5)}, {capture.longitude.toFixed(5)}
                  </p>
                </button>
              </li>
            ))
          )}
        </ul>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100/40">
        {!selected || !token ? (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-base-content/60">
            {captures.length === 0
              ? t("mapboxViewer.collectionEmpty")
              : t("mapboxViewer.collectionSelect")}
          </div>
        ) : (
          <>
            <div className="border-b border-base-300 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{selected.title}</h2>
                  <p className="text-sm text-base-content/60">
                    {selected.approved
                      ? t("mapboxViewer.statusApproved")
                      : t("mapboxViewer.statusPending")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!selected.approved ? (
                    <button
                      type="button"
                      className="btn gap-1 btn-sm btn-primary"
                      disabled={updateCapture.isPending}
                      onClick={() =>
                        void updateCapture.mutateAsync({
                          captureId: selected.id,
                          approved: true,
                        })
                      }
                    >
                      <Check className="size-4" />
                      {t("mapboxViewer.approve")}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn gap-1 btn-outline btn-sm"
                    onClick={() =>
                      void copyProbeText(
                        JSON.stringify(
                          {
                            title: selected.title,
                            tags: selected.tags,
                            latitude: selected.latitude,
                            longitude: selected.longitude,
                            elevation: selected.elevation,
                          },
                          null,
                          2,
                        ),
                      )
                    }
                  >
                    {t("mapboxViewer.copyJson")}
                  </button>
                  <button
                    type="button"
                    className="btn gap-1 btn-outline text-error btn-sm"
                    disabled={deleteCapture.isPending}
                    onClick={() => {
                      void deleteCapture.mutateAsync({ captureId: selected.id }).then(() => {
                        setSelectedId(captures.find((c) => c.id !== selected.id)?.id ?? null);
                      });
                    }}
                  >
                    <Trash2 className="size-4" />
                    {t("mapboxViewer.deleteCapture")}
                  </button>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <MapboxCaptureMiniMap
                accessToken={token}
                latitude={selected.latitude}
                longitude={selected.longitude}
                styleId={captureStyleId(selected)}
                approved={selected.approved}
              />

              <div className="mt-4 rounded-xl border border-base-300 bg-base-100/80">
                <MapboxProbeCoordinatesSection
                  coordinates={{
                    latitude: selected.latitude,
                    longitude: selected.longitude,
                    elevationMeters: selected.elevation,
                  }}
                />
              </div>

              <div className="mt-4 rounded-xl border border-base-300 bg-base-100/80 p-4">
                <p className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
                  {t("mapboxViewer.tagsHeading")}
                </p>
                {Object.keys(selected.tags).length === 0 ? (
                  <p className="mt-2 text-sm text-base-content/60">{t("mapboxViewer.tagsEmpty")}</p>
                ) : (
                  <dl className="mt-2 space-y-1 text-sm">
                    {Object.entries(selected.tags).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <dt className="shrink-0 text-base-content/50">{key}</dt>
                        <dd className="min-w-0 break-words">{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                <button
                  type="button"
                  className="btn mt-3 btn-ghost btn-xs"
                  onClick={() =>
                    void copyProbeText(
                      formatProbeCoordinatesGeoJson({
                        latitude: selected.latitude,
                        longitude: selected.longitude,
                        elevationMeters: selected.elevation,
                      }),
                    )
                  }
                >
                  {t("mapboxViewer.copyGeoJson")}
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
