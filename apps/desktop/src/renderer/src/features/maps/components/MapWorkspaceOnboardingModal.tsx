import {
  Download,
  Layers3,
  MapPin,
  Pencil,
  Settings2,
  SplitSquareHorizontal,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";

type MapWorkspaceOnboardingModalProps = {
  open: boolean;
  onClose: () => void;
  onAddReference: () => void;
  onOpenControls: () => void;
  hasSourceFile: boolean;
};

export function MapWorkspaceOnboardingModal({
  open,
  onClose,
  onAddReference,
  onOpenControls,
  hasSourceFile,
}: MapWorkspaceOnboardingModalProps) {
  const { t } = useTranslation();

  if (!open) {
    return null;
  }

  return (
    <div className="modal-open modal z-[1300]">
      <div className="modal-box max-w-lg px-8 py-8">
        <button
          type="button"
          className="btn absolute top-3 right-3 btn-circle btn-ghost btn-sm"
          onClick={onClose}
          aria-label={t("maps.workspace.onboarding.close")}
        >
          <X className="size-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
            <SplitSquareHorizontal className="size-7 text-primary" />
          </div>

          <h2 className="text-xl font-bold">{t("maps.workspace.onboarding.title")}</h2>
          <p className="mt-2 text-sm text-base-content/70">
            {t("maps.workspace.onboarding.subtitle")}
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-base-300 bg-base-200/40 p-4">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <MapPin className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">{t("maps.workspace.onboarding.step1Title")}</p>
              <p className="mt-0.5 text-xs text-base-content/60">
                {t("maps.workspace.onboarding.step1Desc")}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-base-300 bg-base-200/40 p-4">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary/15 text-secondary">
              <Pencil className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">{t("maps.workspace.onboarding.step2Title")}</p>
              <p className="mt-0.5 text-xs text-base-content/60">
                {t("maps.workspace.onboarding.step2Desc")}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-base-300 bg-base-200/40 p-4">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
              <Layers3 className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">{t("maps.workspace.onboarding.step3Title")}</p>
              <p className="mt-0.5 text-xs text-base-content/60">
                {t("maps.workspace.onboarding.step3Desc")}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-base-300 bg-base-200/40 p-4">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning">
              <Download className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">{t("maps.workspace.onboarding.step4Title")}</p>
              <p className="mt-0.5 text-xs text-base-content/60">
                {t("maps.workspace.onboarding.step4Desc")}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2">
          <button
            type="button"
            className="btn w-full btn-primary"
            onClick={onAddReference}
            disabled={!hasSourceFile}
          >
            <MapPin className="size-4" />
            {t("maps.workspace.onboarding.ctaReference")}
          </button>
          <button type="button" className="btn w-full btn-outline btn-sm" onClick={onOpenControls}>
            <Settings2 className="size-4" />
            {t("maps.workspace.onboarding.ctaControls")}
          </button>
          <button type="button" className="btn w-full btn-ghost btn-sm" onClick={onClose}>
            {t("maps.workspace.onboarding.ctaDismiss")}
          </button>
        </div>
      </div>
      <button type="button" className="modal-backdrop" onClick={onClose} aria-label="Close" />
    </div>
  );
}
