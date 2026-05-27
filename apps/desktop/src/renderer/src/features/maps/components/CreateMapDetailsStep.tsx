import { useTranslation } from "react-i18next";
import { useCreateMapProjectMutation } from "../hooks/useCreateMapProjectMutation";
import { useCreateMapWizardStore } from "../store/create-map-wizard-store";

export function CreateMapDetailsStep() {
  const { t } = useTranslation();
  const createProject = useCreateMapProjectMutation();
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

  function submit() {
    if (!file || !name.trim()) {
      return;
    }

    const parsedLat = latitude.trim() ? Number(latitude) : undefined;
    const parsedLng = longitude.trim() ? Number(longitude) : undefined;

    createProject.mutate({
      name: name.trim(),
      file,
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(locationQuery.trim() ? { locationQuery: locationQuery.trim() } : {}),
      ...(parsedLat !== undefined && Number.isFinite(parsedLat) ? { mapCenterLat: parsedLat } : {}),
      ...(parsedLng !== undefined && Number.isFinite(parsedLng) ? { mapCenterLng: parsedLng } : {}),
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium tracking-wide text-base-content/50 uppercase">
          {t("maps.create.stepDetails")}
        </p>
        <h2 className="mt-1 text-xl font-semibold">{t("maps.create.detailsHeading")}</h2>
        <p className="mt-1 text-sm text-base-content/60">{t("maps.create.detailsDescription")}</p>
      </div>

      {file ? (
        <p className="rounded-box bg-base-200/60 px-3 py-2 text-xs text-base-content/70">
          {t("maps.create.selectedFile", { name: file.name })}
        </p>
      ) : null}

      <label className="form-control">
        <span className="label-text mb-1">{t("maps.create.nameLabel")}</span>
        <input
          className="input-bordered input w-full"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("maps.create.namePlaceholder")}
          required
        />
      </label>

      <label className="form-control">
        <span className="label-text mb-1">{t("maps.create.descriptionLabel")}</span>
        <textarea
          className="textarea-bordered textarea w-full"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t("maps.create.descriptionPlaceholder")}
          rows={2}
        />
      </label>

      <label className="form-control">
        <span className="label-text mb-1">{t("maps.create.locationLabel")}</span>
        <input
          className="input-bordered input w-full"
          value={locationQuery}
          onChange={(event) => setLocationQuery(event.target.value)}
          placeholder={t("maps.create.locationPlaceholder")}
        />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="form-control">
          <span className="label-text mb-1">{t("maps.create.latitudeLabel")}</span>
          <input
            className="input-bordered input w-full"
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            placeholder="-1.286389"
            inputMode="decimal"
          />
        </label>
        <label className="form-control">
          <span className="label-text mb-1">{t("maps.create.longitudeLabel")}</span>
          <input
            className="input-bordered input w-full"
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            placeholder="36.817223"
            inputMode="decimal"
          />
        </label>
      </div>

      {createProject.isError ? (
        <p className="text-sm text-error">
          {createProject.error instanceof Error
            ? createProject.error.message
            : t("maps.create.error")}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button type="button" className="btn flex-1 btn-outline" onClick={() => setStep("upload")}>
          {t("maps.create.back")}
        </button>
        <button
          type="button"
          className="btn flex-1 btn-primary"
          disabled={!file || !name.trim() || createProject.isPending}
          onClick={submit}
        >
          {createProject.isPending ? t("maps.create.processing") : t("maps.create.submit")}
        </button>
      </div>
    </div>
  );
}
