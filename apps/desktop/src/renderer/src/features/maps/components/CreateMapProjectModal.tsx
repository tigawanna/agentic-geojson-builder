import { useTranslation } from "react-i18next";
import { useCreateMapWizardStore } from "../store/create-map-wizard-store";
import { CreateMapCacheBoundsStep } from "./CreateMapCacheBoundsStep";
import { CreateMapCacheBuildingStep } from "./CreateMapCacheBuildingStep";
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

  const isLocked = step === "cacheBuilding";

  function handleClose() {
    if (isLocked) {
      return;
    }
    close();
    reset();
  }

  const modalWidth = step === "cacheBounds" ? "max-w-3xl" : "max-w-2xl";

  return (
    <div className="modal-open modal">
      <div className={`modal-box ${modalWidth} px-8 py-8`}>
        <button
          type="button"
          className="btn absolute top-2 right-2 btn-circle btn-ghost btn-sm"
          disabled={isLocked}
          onClick={handleClose}
          aria-label={t("maps.create.close")}
        >
          ✕
        </button>

        {step === "upload" ? <CreateMapUploadStep /> : null}
        {step === "details" ? <CreateMapDetailsStep /> : null}
        {step === "cacheBounds" ? <CreateMapCacheBoundsStep /> : null}
        {step === "cacheBuilding" ? <CreateMapCacheBuildingStep /> : null}
      </div>
      <button
        type="button"
        className="modal-backdrop"
        disabled={isLocked}
        onClick={handleClose}
        aria-label={t("maps.create.close")}
      />
    </div>
  );
}
