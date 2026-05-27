import { useTranslation } from "react-i18next";
import { useCreateMapProjectMutation } from "../hooks/useCreateMapProjectMutation";
import { useCreateMapWizardStore } from "../store/create-map-wizard-store";
import { TileCacheBoundsPanel } from "./TileCacheBoundsPanel";

export function CreateMapCacheBoundsStep() {
  const { t } = useTranslation();
  const createProject = useCreateMapProjectMutation();
  const file = useCreateMapWizardStore((state) => state.file);
  const name = useCreateMapWizardStore((state) => state.name);
  const locationQuery = useCreateMapWizardStore((state) => state.locationQuery);
  const latitude = useCreateMapWizardStore((state) => state.latitude);
  const longitude = useCreateMapWizardStore((state) => state.longitude);
  const cacheCorners = useCreateMapWizardStore((state) => state.cacheCorners);
  const cacheStyle = useCreateMapWizardStore((state) => state.cacheStyle);
  const setStep = useCreateMapWizardStore((state) => state.setStep);
  const addCacheCorner = useCreateMapWizardStore((state) => state.addCacheCorner);
  const updateCacheCorner = useCreateMapWizardStore((state) => state.updateCacheCorner);
  const resetCacheCorners = useCreateMapWizardStore((state) => state.resetCacheCorners);
  const setCacheStyle = useCreateMapWizardStore((state) => state.setCacheStyle);

  return (
    <div className="flex flex-col gap-6 pr-6">
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-base-content/50 uppercase">
          {t("maps.create.stepCacheBounds")}
        </p>
        <h2 className="text-xl font-semibold">{t("maps.create.cacheBoundsHeading")}</h2>
      </div>

      <TileCacheBoundsPanel
        corners={cacheCorners}
        cacheStyle={cacheStyle}
        locationQuery={locationQuery}
        latitude={latitude}
        longitude={longitude}
        onStyleChange={setCacheStyle}
        onCornerAdd={addCacheCorner}
        onCornerMove={updateCacheCorner}
        onResetCorners={resetCacheCorners}
      />

      <div className="flex gap-3 pt-2">
        <button type="button" className="btn flex-1 btn-outline" onClick={() => setStep("details")}>
          {t("maps.create.back")}
        </button>
        <button
          type="button"
          className="btn flex-1 btn-primary"
          disabled={!file || !name.trim() || cacheCorners.length !== 4 || createProject.isPending}
          onClick={() => createProject.mutate()}
        >
          {t("maps.create.cacheAndCreate")}
        </button>
      </div>
    </div>
  );
}
