import { useTranslation } from "react-i18next";
import { useUpdater } from "../../hooks/useUpdater";

export function AboutPage() {
  const { t } = useTranslation();
  const { checkForUpdates } = useUpdater();

  return (
    <section className="py-8">
      <h2 className="text-3xl font-semibold tracking-tight">{t("about.heading")}</h2>
      <p className="mt-3 max-w-prose text-neutral-600 dark:text-neutral-400">{t("about.body")}</p>

      <div className="mt-6">
        <button
          type="button"
          onClick={() => void checkForUpdates()}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          {t("updater.check")}
        </button>
      </div>
    </section>
  );
}
