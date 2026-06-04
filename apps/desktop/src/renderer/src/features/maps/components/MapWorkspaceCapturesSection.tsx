import { Check, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useIpcMutation } from "@renderer/hooks/useIpc";
import { useMapboxCapturesQuery } from "@renderer/features/maps/hooks/useMapboxCapturesQuery";

export function MapWorkspaceCapturesSection() {
  const { t } = useTranslation();
  const capturesQuery = useMapboxCapturesQuery();
  const updateCapture = useIpcMutation("mapboxCaptures:update");
  const deleteCapture = useIpcMutation("mapboxCaptures:delete");
  const captures = capturesQuery.data?.captures ?? [];

  return (
    <section className="mt-4 space-y-2" data-test="workspace-captures-section">
      <h3 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
        {t("mapboxViewer.collectionTitle")}
      </h3>
      {captures.length === 0 ? (
        <p className="rounded-md border border-dashed border-base-content/15 px-2.5 py-3 text-center text-xs text-base-content/55">
          {t("mapboxViewer.collectionEmpty")}
        </p>
      ) : (
        <ul className="space-y-1">
          {captures.map((capture) => (
            <li
              key={capture.id}
              className="rounded-md border border-base-content/10 bg-base-100/60 px-2.5 py-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`size-2 shrink-0 rounded-full ${capture.approved ? "bg-success" : "bg-warning"}`}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{capture.title}</span>
              </div>
              <p className="mt-0.5 truncate pl-4 font-mono text-[11px] text-base-content/55">
                {capture.latitude.toFixed(5)}, {capture.longitude.toFixed(5)}
                {capture.elevation != null ? ` · ${Math.round(capture.elevation)} m` : ""}
              </p>
              {capture.description ? (
                <p className="mt-0.5 line-clamp-2 pl-4 text-[11px] text-base-content/55">
                  {capture.description}
                </p>
              ) : null}
              <div className="mt-1.5 flex gap-1 pl-4">
                {!capture.approved ? (
                  <button
                    type="button"
                    className="btn gap-1 btn-xs btn-primary"
                    disabled={updateCapture.isPending}
                    onClick={() =>
                      void updateCapture.mutateAsync({ captureId: capture.id, approved: true })
                    }
                  >
                    <Check className="size-3" />
                    {t("mapboxViewer.approve")}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn gap-1 text-error btn-ghost btn-xs"
                  disabled={deleteCapture.isPending}
                  onClick={() => void deleteCapture.mutateAsync({ captureId: capture.id })}
                >
                  <Trash2 className="size-3" />
                  {t("mapboxViewer.deleteCapture")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
