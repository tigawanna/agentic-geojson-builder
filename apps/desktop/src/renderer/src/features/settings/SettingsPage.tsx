import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PageShell } from "@renderer/components/common/PageShell";
import { McpSettingsSection } from "@renderer/features/settings/McpSettingsSection";
import { useIpcMutation, useIpcQuery } from "@renderer/hooks/useIpc";
import { useTheme, type Theme } from "@renderer/features/theme/ThemeProvider";

const DEMO_KEY = "demo:value";

export function SettingsPage() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [value, setValue] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const stored = useIpcQuery("store:get", { key: DEMO_KEY });
  const save = useIpcMutation("store:set", {
    onSuccess: () => {
      setToast(t("settings.saved"));
      setTimeout(() => setToast(null), 1500);
    },
  });
  const clear = useIpcMutation("store:delete");

  return (
    <PageShell title={t("settings.heading")}>
      <div className="space-y-5">
        <article className="glass-card p-5">
          <Row label={t("settings.theme")}>
            <div className="join">
              {(["light", "dark", "system"] as Theme[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTheme(option)}
                  className={`btn join-item btn-sm ${theme === option ? "btn-primary" : "btn-outline"}`}
                >
                  {t(`theme.${option}`)}
                </button>
              ))}
            </div>
          </Row>
        </article>

        <McpSettingsSection />

        <article className="glass-card p-5">
          <h3 className="text-base font-semibold">{t("settings.storageHeading")}</h3>
          <p className="mt-1 text-sm text-base-content/60">{t("settings.storageHint")}</p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="form-control min-w-0 flex-1">
              <span className="label-text mb-1 text-xs text-base-content/60">
                {t("settings.valueLabel")}
              </span>
              <input
                type="text"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                className="input-bordered selectable input w-full"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => save.mutate({ key: DEMO_KEY, value })}
                className="btn btn-primary"
              >
                {t("settings.save")}
              </button>
              <button
                type="button"
                onClick={() => clear.mutate({ key: DEMO_KEY })}
                className="btn btn-outline"
              >
                {t("settings.clear")}
              </button>
            </div>
          </div>

          <p className="mt-4 text-xs text-base-content/60">
            Current stored value:{" "}
            <span className="font-mono">{JSON.stringify(stored.data ?? null)}</span>
          </p>

          {toast ? <p className="mt-2 text-xs text-success">{toast}</p> : null}
        </article>
      </div>
    </PageShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-medium text-base-content/80">{label}</span>
      {children}
    </div>
  );
}
