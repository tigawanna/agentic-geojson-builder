import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AuditLogPanel } from "@renderer/features/audit-log/components/AuditLogPanel";

type MapAuditLogModalProps = {
  mapId: number;
  open: boolean;
  onClose: () => void;
};

export function MapAuditLogModal({ mapId, open, onClose }: MapAuditLogModalProps) {
  const { t } = useTranslation();

  if (!open) {
    return null;
  }

  return (
    <div className="modal-open modal z-1200">
      <div className="modal-box flex max-h-[88vh] max-w-3xl flex-col px-6 py-6 shadow-2xl">
        <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">{t("maps.workspace.auditLogTitle")}</h3>
            <p className="mt-1 text-xs text-base-content/55">
              {t("maps.workspace.auditLogSubtitle")}
            </p>
          </div>
          <button type="button" className="btn btn-square btn-ghost btn-sm" onClick={onClose}>
            <X className="size-4" />
          </button>
        </div>

        <AuditLogPanel mapId={mapId} fillHeight className="min-h-0 flex-1" />
      </div>
      <button type="button" className="modal-backdrop" onClick={onClose} aria-hidden />
    </div>
  );
}
