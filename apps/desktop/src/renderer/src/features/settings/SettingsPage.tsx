import { useTranslation } from "react-i18next";
import { PageShell } from "@renderer/components/common/PageShell";
import { DataBackupSection } from "@renderer/features/settings/DataBackupSection";
import { McpSettingsSection } from "@renderer/features/settings/McpSettingsSection";
import { ThemeSelector } from "@renderer/features/settings/ThemeSelector";

export function SettingsPage() {
  const { t } = useTranslation();

  return (
    <PageShell title={t("settings.heading")}>
      <div className="space-y-5">
        <article className="glass-card p-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold">{t("settings.theme")}</h3>
            <p className="mt-1 text-sm text-base-content/55">{t("settings.themeHint")}</p>
          </div>
          <ThemeSelector />
        </article>

        <McpSettingsSection />

        <DataBackupSection />
      </div>
    </PageShell>
  );
}
