import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Eye, EyeOff } from "lucide-react";
import {
  useMapboxTokenQuery,
  useSetMapboxTokenMutation,
} from "@renderer/features/maps/hooks/useMapboxToken";

export function MapboxSettingsSection() {
  const { t } = useTranslation();
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
    <article className="glass-card p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold">{t("settings.mapbox.heading")}</h3>
        <p className="mt-1 text-sm text-base-content/60">{t("settings.mapbox.description")}</p>
      </div>

      <label className="form-control gap-2.5">
        <span className="label-text font-medium">{t("settings.mapbox.tokenLabel")}</span>
        <div className="flex items-center gap-2">
          <input
            type={revealed ? "text" : "password"}
            className="input-bordered input w-full font-mono text-sm"
            placeholder="pk.eyJ1Ijoi…"
            value={draft}
            spellCheck={false}
            autoComplete="off"
            data-test="mapbox-token-input"
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

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          className="btn btn-sm btn-primary"
          disabled={setToken.isPending || draft === (tokenQuery.data ?? "")}
          onClick={() => void handleSave()}
          data-test="mapbox-token-save"
        >
          {saved ? <Check className="size-4" /> : null}
          {saved ? t("settings.mapbox.saved") : t("settings.mapbox.save")}
        </button>
        {tokenQuery.data ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={setToken.isPending}
            onClick={() => void setToken.mutateAsync(null)}
          >
            {t("settings.mapbox.clear")}
          </button>
        ) : null}
      </div>
    </article>
  );
}
