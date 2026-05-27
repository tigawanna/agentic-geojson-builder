import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { PageShell } from "../../components/common/PageShell";
import { CreateMapProjectModal } from "./components/CreateMapProjectModal";
import { useCreateMapWizardStore } from "./store/create-map-wizard-store";
import { useMapsListQuery } from "./useMapsListQuery";

export function MapsListPage() {
  const { t } = useTranslation();
  const maps = useMapsListQuery();
  const openWizard = useCreateMapWizardStore((state) => state.open);

  return (
    <>
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
            <ul className="divide-y divide-base-content/10 rounded-box border border-base-content/10">
              {maps.data.map((map) => (
                <li key={map.id}>
                  <Link
                    to="/maps/$mapId"
                    params={{ mapId: String(map.id) }}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-base-200/50"
                  >
                    <div>
                      <p className="font-medium">{map.name}</p>
                      {map.locationQuery ? (
                        <p className="text-xs text-base-content/50">{map.locationQuery}</p>
                      ) : null}
                    </div>
                    <span className="font-mono text-xs text-base-content/40">#{map.id}</span>
                  </Link>
                </li>
              ))}
            </ul>
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

      <CreateMapProjectModal />
    </>
  );
}
