import { useTranslation } from "react-i18next";
import { useIpcEvent } from "@renderer/hooks/useIpcEvent";
import { useCreateMapProjectMutation } from "@renderer/features/maps/hooks/useCreateMapProjectMutation";
import { useCreateMapWizardStore } from "@renderer/features/maps/store/create-map-wizard-store";

export function CreateMapCacheBuildingStep() {
  const { t } = useTranslation();
  const createProject = useCreateMapProjectMutation();
  const buildProgress = useCreateMapWizardStore((state) => state.buildProgress);
  const buildMessage = useCreateMapWizardStore((state) => state.buildMessage);
  const setBuildProgress = useCreateMapWizardStore((state) => state.setBuildProgress);

  useIpcEvent("tileCache:buildProgress", (progress) => {
    setBuildProgress({ completed: progress.completed, total: progress.total });
  });

  const percent =
    buildProgress && buildProgress.total > 0
      ? Math.round((buildProgress.completed / buildProgress.total) * 100)
      : null;

  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <span className="loading loading-lg loading-spinner text-primary" />
      <div>
        <p className="font-medium">
          {createProject.isPending && !buildProgress
            ? t("maps.create.processingHeading")
            : t("maps.create.cacheBuildingHeading")}
        </p>
        <p className="mt-1 text-sm text-base-content/60">
          {buildMessage ?? t("maps.create.cacheBuildingDescription")}
        </p>
        {percent != null ? (
          <p className="mt-3 text-sm font-medium text-primary">
            {t("maps.create.cacheProgress", {
              percent,
              completed: buildProgress?.completed ?? 0,
              total: buildProgress?.total ?? 0,
            })}
          </p>
        ) : null}
      </div>
      {createProject.isError ? (
        <p className="text-sm text-error">
          {createProject.error instanceof Error
            ? createProject.error.message
            : t("maps.create.error")}
        </p>
      ) : null}
    </div>
  );
}
