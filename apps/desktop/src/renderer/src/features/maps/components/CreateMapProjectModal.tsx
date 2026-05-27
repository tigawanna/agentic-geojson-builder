import { useTranslation } from "react-i18next";
import { useCreateMapWizardStore } from "../store/create-map-wizard-store";
import { CreateMapDetailsStep } from "./CreateMapDetailsStep";
import { CreateMapUploadStep } from "./CreateMapUploadStep";

export function CreateMapProjectModal() {
  const { t } = useTranslation();
  const isOpen = useCreateMapWizardStore((state) => state.isOpen);
  const step = useCreateMapWizardStore((state) => state.step);
  const close = useCreateMapWizardStore((state) => state.close);
  const reset = useCreateMapWizardStore((state) => state.reset);

  if (!isOpen) {
    return null;
  }

  function handleClose() {
    if (step === "processing") {
      return;
    }
    close();
    reset();
  }

  return (
    <div className="modal-open modal">
      <div className="modal-box max-w-2xl">
        <button
          type="button"
          className="btn absolute top-2 right-2 btn-circle btn-ghost btn-sm"
          disabled={step === "processing"}
          onClick={handleClose}
          aria-label={t("maps.create.close")}
        >
          ✕
        </button>

        {step === "upload" ? <CreateMapUploadStep /> : null}
        {step === "details" ? <CreateMapDetailsStep /> : null}
        {step === "processing" ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <span className="loading loading-lg loading-spinner text-primary" />
            <div>
              <p className="font-medium">{t("maps.create.processingHeading")}</p>
              <p className="mt-1 text-sm text-base-content/60">
                {t("maps.create.processingDescription")}
              </p>
            </div>
          </div>
        ) : null}
      </div>
      <button
        type="button"
        className="modal-backdrop"
        disabled={step === "processing"}
        onClick={handleClose}
        aria-label={t("maps.create.close")}
      />
    </div>
  );
}
