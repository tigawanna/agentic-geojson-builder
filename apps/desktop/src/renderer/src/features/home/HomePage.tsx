import { useTranslation } from "react-i18next";
import { PageShell } from "@renderer/components/common/PageShell";
import { MapsIpcDemo } from "@renderer/features/maps/MapsIpcDemo";
import { useIpcQuery } from "@renderer/hooks/useIpc";

export function HomePage() {
  const { t } = useTranslation();
  const version = useIpcQuery("app:getVersion", undefined);
  const platform = useIpcQuery("app:getPlatform", undefined);

  return (
    <PageShell title={t("home.heading")} description={t("home.description")}>
      <div className="grid gap-4 md:grid-cols-2">
        <article className="glass-card p-5">
          <p className="text-xs font-medium tracking-wide text-base-content/50 uppercase">
            {t("home.version")}
          </p>
          <p className="mt-2 font-mono text-2xl font-semibold text-primary">
            {version.data ?? "—"}
          </p>
        </article>
        <article className="glass-card p-5">
          <p className="text-xs font-medium tracking-wide text-base-content/50 uppercase">
            {t("home.platform")}
          </p>
          <p className="mt-2 font-mono text-2xl font-semibold capitalize">{platform.data ?? "—"}</p>
        </article>
      </div>

      <div className="mt-6">
        <MapsIpcDemo />
      </div>
    </PageShell>
  );
}
