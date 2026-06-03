import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, Check, Eye, EyeOff, ExternalLink, KeyRound } from "lucide-react";
import {
  useMapboxTokenQuery,
  useSetMapboxTokenMutation,
} from "@renderer/features/maps/hooks/useMapboxToken";
import { isMapboxTokenValidationError } from "@renderer/features/maps/lib/mapbox-auth-error";

type MapboxTokenRequiredModalProps = {
  reason?: "missing" | "invalid";
};

export function MapboxTokenRequiredModal({ reason = "missing" }: MapboxTokenRequiredModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const tokenQuery = useMapboxTokenQuery();
  const setToken = useSetMapboxTokenMutation();
  const [draft, setDraft] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const isInvalid = reason === "invalid";

  useEffect(() => {
    setDraft(tokenQuery.data ?? "");
  }, [tokenQuery.data]);

  async function handleSave() {
    setSaveError(null);
    try {
      await setToken.mutateAsync(draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (error) {
      if (isMapboxTokenValidationError(error)) {
        setSaveError(t("maps.workspace.mapboxTokenModal.invalidSave"));
      }
    }
  }

  return (
    <div className="modal-open modal pointer-events-auto absolute inset-0 z-20">
      <div className="modal-box max-w-md px-6 py-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
              isInvalid ? "bg-error/10" : "bg-primary/10"
            }`}
          >
            {isInvalid ? (
              <AlertCircle className="size-5 text-error" />
            ) : (
              <KeyRound className="size-5 text-primary" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg leading-snug font-semibold">
              {isInvalid
                ? t("maps.workspace.mapboxTokenModal.invalidTitle")
                : t("maps.workspace.mapboxTokenModal.title")}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-base-content/70">
              {isInvalid
                ? t("maps.workspace.mapboxTokenModal.invalidDescription")
                : t("maps.workspace.mapboxTokenModal.description")}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3 rounded-xl border border-base-300 bg-base-200/40 p-4">
          <p className="text-sm font-medium">{t("settings.mapbox.tokenLabel")}</p>
          <div className="flex items-center gap-2">
            <input
              type={revealed ? "text" : "password"}
              className={`input-bordered input w-full min-w-0 font-mono text-sm ${
                saveError ? "input-error" : ""
              }`}
              placeholder="pk.eyJ1Ijoi…"
              value={draft}
              spellCheck={false}
              autoComplete="off"
              data-test="mapbox-token-modal-input"
              onChange={(event) => {
                setDraft(event.target.value);
                if (saveError) {
                  setSaveError(null);
                }
              }}
            />
            <button
              type="button"
              className="btn btn-square shrink-0 btn-ghost btn-sm"
              aria-label={revealed ? t("settings.mapbox.hide") : t("settings.mapbox.reveal")}
              onClick={() => setRevealed((value) => !value)}
            >
              {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {saveError ? (
            <p className="text-sm text-error" data-test="mapbox-token-modal-error">
              {saveError}
            </p>
          ) : null}
          <a
            href="https://account.mapbox.com/access-tokens/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <ExternalLink className="size-3.5 shrink-0" />
            {t("maps.workspace.mapboxTokenModal.openMapbox")}
          </a>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            className="btn w-full btn-primary"
            disabled={setToken.isPending || draft.trim().length === 0}
            data-test="mapbox-token-modal-save"
            onClick={() => void handleSave()}
          >
            {saved ? <Check className="size-4" /> : null}
            {saved
              ? t("settings.mapbox.saved")
              : t("maps.workspace.mapboxTokenModal.saveAndShowMap")}
          </button>
          <button
            type="button"
            className="btn w-full btn-ghost btn-sm"
            onClick={() => void navigate({ to: "/settings" })}
          >
            {t("maps.workspace.mapboxTokenModal.openSettings")}
          </button>
        </div>
      </div>
    </div>
  );
}
