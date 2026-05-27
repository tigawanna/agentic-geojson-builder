import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useIpcMutation, useIpcQuery } from "../../hooks/useIpc";
import { useTheme, type Theme } from "../theme/ThemeProvider";
import { supportedLanguages } from "../../i18n";

const DEMO_KEY = "demo:value";

export function SettingsPage() {
  const { t, i18n } = useTranslation();
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
    <section className="py-8">
      <h2 className="text-3xl font-semibold tracking-tight">{t("settings.heading")}</h2>

      <div className="mt-8 space-y-8">
        <Row label={t("settings.theme")}>
          <div className="flex gap-2">
            {(["light", "dark", "system"] as Theme[]).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setTheme(opt)}
                className={[
                  "rounded-md border px-3 py-1.5 text-sm",
                  theme === opt
                    ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300"
                    : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800",
                ].join(" ")}
              >
                {t(`theme.${opt}`)}
              </button>
            ))}
          </div>
        </Row>

        <Row label={t("settings.language")}>
          <select
            value={i18n.language}
            onChange={(e) => void i18n.changeLanguage(e.target.value)}
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            {supportedLanguages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </Row>

        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="font-medium">{t("settings.storageHeading")}</h3>
          <p className="mt-1 text-sm text-neutral-500">{t("settings.storageHint")}</p>

          <div className="mt-4 flex items-end gap-3">
            <label className="flex-1">
              <div className="mb-1 text-xs text-neutral-500">{t("settings.valueLabel")}</div>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="selectable w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
              />
            </label>
            <button
              type="button"
              onClick={() => save.mutate({ key: DEMO_KEY, value })}
              className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              {t("settings.save")}
            </button>
            <button
              type="button"
              onClick={() => clear.mutate({ key: DEMO_KEY })}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
            >
              {t("settings.clear")}
            </button>
          </div>

          <p className="mt-3 text-xs text-neutral-500">
            Current stored value:{" "}
            <span className="font-mono">{JSON.stringify(stored.data ?? null)}</span>
          </p>

          {toast && <p className="mt-2 text-xs text-green-600">{toast}</p>}
        </div>
      </div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
      {children}
    </div>
  );
}
