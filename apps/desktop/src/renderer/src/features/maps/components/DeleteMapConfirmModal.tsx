import { useTranslation } from "react-i18next";
import type { MapListItem } from "@shared/maps.types";

type DeleteMapConfirmModalProps = {
  map: MapListItem | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteMapConfirmModal({
  map,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteMapConfirmModalProps) {
  const { t } = useTranslation();

  if (!map) {
    return null;
  }

  return (
    <div className="modal-open modal z-50">
      <div className="modal-box max-w-md px-8 py-8">
        <h3 className="text-lg font-semibold">{t("maps.delete.title")}</h3>
        <p className="mt-2 text-sm text-base-content/70">
          {t("maps.delete.description", { name: map.name })}
        </p>
        <div className="modal-action">
          <button type="button" className="btn btn-ghost" disabled={isDeleting} onClick={onCancel}>
            {t("maps.delete.cancel")}
          </button>
          <button
            type="button"
            className="btn btn-error"
            disabled={isDeleting}
            data-test="confirm-delete-map"
            onClick={onConfirm}
          >
            {isDeleting ? t("maps.delete.deleting") : t("maps.delete.confirm")}
          </button>
        </div>
      </div>
      <button type="button" className="modal-backdrop" aria-hidden onClick={onCancel} />
    </div>
  );
}
