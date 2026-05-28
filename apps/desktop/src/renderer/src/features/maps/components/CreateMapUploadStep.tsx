import { useTranslation } from "react-i18next";
import { useCreateMapWizardStore } from "@renderer/features/maps/store/create-map-wizard-store";

const acceptedTypes = "application/pdf,image/png,image/jpeg,image/webp";

export function CreateMapUploadStep() {
  const { t } = useTranslation();
  const file = useCreateMapWizardStore((state) => state.file);
  const setFile = useCreateMapWizardStore((state) => state.setFile);
  const setStep = useCreateMapWizardStore((state) => state.setStep);

  return (
    <div className="flex flex-col gap-8 pr-6">
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-base-content/50 uppercase">
          {t("maps.create.stepUpload")}
        </p>
        <h2 className="text-xl font-semibold">{t("maps.create.uploadHeading")}</h2>
        <p className="text-sm leading-relaxed text-base-content/60">
          {t("maps.create.uploadDescription")}
        </p>
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center gap-4 rounded-box border border-dashed border-base-content/20 bg-base-200/40 px-8 py-14 hover:border-primary/40">
        <span className="text-sm font-medium">
          {file ? file.name : t("maps.create.fileDropLabel")}
        </span>
        <span className="text-xs text-base-content/50">{t("maps.create.fileHint")}</span>
        <input
          type="file"
          accept={acceptedTypes}
          className="hidden"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </label>

      <button
        type="button"
        className="btn w-full btn-primary"
        disabled={!file}
        onClick={() => setStep("details")}
      >
        {t("maps.create.continue")}
      </button>
    </div>
  );
}
