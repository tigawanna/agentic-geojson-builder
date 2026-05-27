import { useTranslation } from "react-i18next";
import { PageShell } from "../../components/common/PageShell";
import { useUpdater } from "../../hooks/useUpdater";

export function AboutPage() {
  const { t } = useTranslation();
  const { checkForUpdates } = useUpdater();

  return (
    <PageShell title={t("about.heading")} description={t("about.body")}>
      <div className="glass-card p-5">
        <button type="button" onClick={() => void checkForUpdates()} className="btn btn-primary">
          {t("updater.check")}
        </button>
      </div>
    </PageShell>
  );
}
