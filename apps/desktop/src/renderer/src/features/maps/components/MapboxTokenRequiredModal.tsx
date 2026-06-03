import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { Check, Eye, EyeOff, ExternalLink } from "lucide-react";
import {
  useMapboxTokenQuery,
  useSetMapboxTokenMutation,
} from "@renderer/features/maps/hooks/useMapboxToken";

export function MapboxTokenRequiredModal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const tokenQuery = useMapboxTokenQuery();
  const setToken = useSetMapboxTokenMutation();
  const [draft, setDraft] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(tokenQuery.data ?? "");
  }, [tokenQuery.data]);

  async function handleSave() {
    await setToken.mutateAsync(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="modal-open modal pointer-events-auto absolute inset-0 z-20">
      <div className="modal-box max-w-lg px-6 py-6 shadow-2xl">
        <h2 className="text-lg font-semibold">{t("maps.workspace.mapboxTokenModal.title")}</h2>
        <p className="mt-2 text-sm text-base-content/70">
          {t("maps.workspace.mapboxTokenModal.description")}
        </p>

        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-base-content/80">
          <li>{t("maps.workspace.mapboxTokenModal.stepAccount")}</li>
          <li>{t("maps.workspace.mapboxTokenModal.stepToken")}</li>
          <li>{t("maps.workspace.mapboxTokenModal.stepPaste")}</li>
        </ol>

        <a
          href="https://account.mapbox.com/access-tokens/"
          target="_blank"
          rel="noreferrer"
          className="btn mt-4 gap-2 btn-outline btn-sm"
        >
          <ExternalLink className="size-4" />
          {t("maps.workspace.mapboxTokenModal.openMapbox")}
        </a>

        <label className="form-control mt-5 gap-2">
          <span className="label-text font-medium">{t("settings.mapbox.tokenLabel")}</span>
          <div className="flex items-center gap-2">
            <input
              type={revealed ? "text" : "password"}
              className="input-bordered input w-full font-mono text-sm"
              placeholder="pk.eyJ1Ijoi…"
              value={draft}
              spellCheck={false}
              autoComplete="off"
              data-test="mapbox-token-modal-input"
              onChange={(event) => setDraft(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-square btn-ghost btn-sm"
              aria-label={revealed ? t("settings.mapbox.hide") : t("settings.mapbox.reveal")}
              onClick={() => setRevealed((value) => !value)}
            >
              {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </label>

        <div className="modal-action mt-6">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => void navigate({ to: "/settings" })}
          >
            {t("maps.workspace.mapboxTokenModal.openSettings")}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={setToken.isPending || draft.trim().length === 0}
            data-test="mapbox-token-modal-save"
            onClick={() => void handleSave()}
          >
            {saved ? <Check className="size-4" /> : null}
            {saved
              ? t("settings.mapbox.saved")
              : t("maps.workspace.mapboxTokenModal.saveAndShowMap")}
          </button>
        </div>
      </div>
    </div>
  );
}
