import { useTranslation } from "react-i18next";
import { PageShell } from "../../components/common/PageShell";
import { MapProjectCard } from "./components/MapProjectCard";
import { useCreateMapWizardStore } from "./store/create-map-wizard-store";
import { useMapsListQuery } from "./useMapsListQuery";

export function MapsListPage() {
  const { t } = useTranslation();
  const maps = useMapsListQuery();
  const openWizard = useCreateMapWizardStore((state) => state.open);

  return (
    <PageShell title={t("maps.list.heading")} description={t("maps.list.description")}>
      <div className="flex justify-end">
        <button type="button" className="btn btn-sm btn-primary" onClick={openWizard}>
          {t("maps.list.create")}
        </button>
      </div>

      <div className="mt-4">
        {maps.isLoading ? (
          <p className="text-sm text-base-content/60">{t("maps.list.loading")}</p>
        ) : maps.isError ? (
          <p className="text-sm text-error">{t("maps.list.error")}</p>
        ) : maps.data?.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {maps.data.map((map) => (
              <MapProjectCard key={map.id} map={map} />
            ))}
          </div>
        ) : (
          <div className="rounded-box border border-dashed border-base-content/15 px-6 py-10 text-center">
            <p className="text-sm text-base-content/60">{t("maps.list.empty")}</p>
            <button type="button" className="btn mt-4 btn-sm btn-primary" onClick={openWizard}>
              {t("maps.list.create")}
            </button>
          </div>
        )}
      </div>
    </PageShell>
  );
}
