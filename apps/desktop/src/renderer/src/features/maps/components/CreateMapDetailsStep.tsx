import { useTranslation } from "react-i18next";
import { useCreateMapWizardStore } from "@renderer/features/maps/store/create-map-wizard-store";

export function CreateMapDetailsStep() {
  const { t } = useTranslation();
  const file = useCreateMapWizardStore((state) => state.file);
  const name = useCreateMapWizardStore((state) => state.name);
  const description = useCreateMapWizardStore((state) => state.description);
  const locationQuery = useCreateMapWizardStore((state) => state.locationQuery);
  const latitude = useCreateMapWizardStore((state) => state.latitude);
  const longitude = useCreateMapWizardStore((state) => state.longitude);
  const setStep = useCreateMapWizardStore((state) => state.setStep);
  const setName = useCreateMapWizardStore((state) => state.setName);
  const setDescription = useCreateMapWizardStore((state) => state.setDescription);
  const setLocationQuery = useCreateMapWizardStore((state) => state.setLocationQuery);
  const setLatitude = useCreateMapWizardStore((state) => state.setLatitude);
  const setLongitude = useCreateMapWizardStore((state) => state.setLongitude);

  return (
    <div className="flex flex-col gap-8 pr-6">
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-base-content/50 uppercase">
          {t("maps.create.stepDetails")}
        </p>
        <h2 className="text-xl font-semibold">{t("maps.create.detailsHeading")}</h2>
        <p className="text-sm leading-relaxed text-base-content/60">
          {t("maps.create.detailsDescription")}
        </p>
      </div>

      {file ? (
        <p className="rounded-box bg-base-200/60 px-4 py-3 text-xs leading-relaxed text-base-content/70">
          {t("maps.create.selectedFile", { name: file.name })}
        </p>
      ) : null}

      <div className="flex flex-col gap-5">
        <label className="form-control gap-2">
          <span className="label-text">{t("maps.create.nameLabel")}</span>
          <input
            className="input-bordered input w-full"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("maps.create.namePlaceholder")}
            required
          />
        </label>

        <label className="form-control gap-2">
          <span className="label-text">{t("maps.create.descriptionLabel")}</span>
          <textarea
            className="textarea-bordered textarea min-h-24 w-full"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t("maps.create.descriptionPlaceholder")}
            rows={3}
          />
        </label>

        <label className="form-control gap-2">
          <span className="label-text">{t("maps.create.locationLabel")}</span>
          <input
            className="input-bordered input w-full"
            value={locationQuery}
            onChange={(event) => setLocationQuery(event.target.value)}
            placeholder={t("maps.create.locationPlaceholder")}
          />
        </label>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="form-control gap-2">
            <span className="label-text">{t("maps.create.latitudeLabel")}</span>
            <input
              className="input-bordered input w-full"
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
              placeholder="-1.286389"
              inputMode="decimal"
            />
          </label>
          <label className="form-control gap-2">
            <span className="label-text">{t("maps.create.longitudeLabel")}</span>
            <input
              className="input-bordered input w-full"
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
              placeholder="36.817223"
              inputMode="decimal"
            />
          </label>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" className="btn flex-1 btn-outline" onClick={() => setStep("upload")}>
          {t("maps.create.back")}
        </button>
        <button
          type="button"
          className="btn flex-1 btn-primary"
          disabled={!file || !name.trim()}
          onClick={() => setStep("cacheBounds")}
        >
          {t("maps.create.continue")}
        </button>
      </div>
    </div>
  );
}
