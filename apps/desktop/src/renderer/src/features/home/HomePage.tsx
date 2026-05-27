import { useTranslation } from "react-i18next";
import { useIpcQuery } from "../../hooks/useIpc";

export function HomePage() {
  const { t } = useTranslation();
  const version = useIpcQuery("app:getVersion", undefined);
  const platform = useIpcQuery("app:getPlatform", undefined);

  return (
    <section className="py-8">
      <h2 className="text-3xl font-semibold tracking-tight">{t("home.heading")}</h2>
      <p className="mt-3 max-w-prose text-neutral-600 dark:text-neutral-400">
        {t("home.description")}
      </p>

      <dl className="mt-8 grid max-w-md grid-cols-2 gap-4 rounded-lg border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900">
        <dt className="text-neutral-500">{t("home.version")}</dt>
        <dd className="font-mono">{version.data ?? "—"}</dd>
        <dt className="text-neutral-500">{t("home.platform")}</dt>
        <dd className="font-mono">{platform.data ?? "—"}</dd>
      </dl>
    </section>
  );
}
