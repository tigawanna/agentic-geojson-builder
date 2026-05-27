import { useTranslation } from "react-i18next";
import { useCreateMapProjectMutation } from "../hooks/useCreateMapProjectMutation";
import { useCreateMapWizardStore } from "../store/create-map-wizard-store";
import { WizardBoundsMap } from "./WizardBoundsMap";

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
  const resetCacheCorners = useCreateMapWizardStore((state) => state.resetCacheCorners);
  const setCacheStyle = useCreateMapWizardStore((state) => state.setCacheStyle);

  return (
    <div className="flex flex-col gap-6 pr-6">
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-base-content/50 uppercase">
          {t("maps.create.stepCacheBounds")}
        </p>
        <h2 className="text-xl font-semibold">{t("maps.create.cacheBoundsHeading")}</h2>
        <p className="text-sm leading-relaxed text-base-content/60">
          {t("maps.create.cacheBoundsDescription")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["satellite", "outline", "standard"] as const).map((style) => (
          <button
            key={style}
            type="button"
            className={`btn btn-sm ${cacheStyle === style ? "btn-primary" : "btn-outline"}`}
            onClick={() => setCacheStyle(style)}
          >
            {t(`maps.create.baseMap.${style}`)}
          </button>
        ))}
      </div>

      <WizardBoundsMap
        corners={cacheCorners}
        locationQuery={locationQuery}
        latitude={latitude}
        longitude={longitude}
        style={cacheStyle}
        onCornerAdd={addCacheCorner}
      />

      <div className="flex items-center justify-between text-sm text-base-content/70">
        <span>{t("maps.create.cachePoints", { count: cacheCorners.length })}</span>
        <button type="button" className="btn btn-ghost btn-xs" onClick={resetCacheCorners}>
          {t("maps.create.resetPoints")}
        </button>
      </div>

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
