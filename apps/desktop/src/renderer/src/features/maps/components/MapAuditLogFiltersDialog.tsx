import { useEffect, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMapsListQuery } from "@renderer/features/maps/useMapsListQuery";
import type { AuditLogFilters } from "@renderer/features/maps/hooks/useAuditLogQuery";

type MapAuditLogFiltersDialogProps = {
  open: boolean;
  filters: AuditLogFilters;
  showMapFilter?: boolean;
  onApply: (filters: AuditLogFilters) => void;
  onClose: () => void;
};

type DraftFilters = {
  mapId: string;
  entityType: string;
  action: string;
  source: string;
  entityId: string;
};

function toDraft(filters: AuditLogFilters): DraftFilters {
  return {
    mapId: filters.mapId != null ? String(filters.mapId) : "",
    entityType: filters.entityType ?? "",
    action: filters.action ?? "",
    source: filters.source ?? "",
    entityId: filters.entityId != null ? String(filters.entityId) : "",
  };
}

function fromDraft(draft: DraftFilters): AuditLogFilters {
  const entityId = draft.entityId.trim();
  const parsedEntityId = entityId.length > 0 ? Number(entityId) : undefined;
  const mapId = draft.mapId.trim();
  const parsedMapId = mapId.length > 0 ? Number(mapId) : undefined;

  return {
    mapId: parsedMapId != null && Number.isFinite(parsedMapId) ? parsedMapId : undefined,
    entityType: draft.entityType || undefined,
    action: draft.action || undefined,
    source: draft.source || undefined,
    entityId:
      parsedEntityId != null && Number.isFinite(parsedEntityId) ? parsedEntityId : undefined,
  };
}

export function countActiveAuditLogFilters(
  filters: AuditLogFilters,
  options?: { includeMapFilter?: boolean },
) {
  let count = 0;
  if (options?.includeMapFilter && filters.mapId != null) count += 1;
  if (filters.entityType) count += 1;
  if (filters.action) count += 1;
  if (filters.source) count += 1;
  if (filters.entityId != null) count += 1;
  return count;
}

export function MapAuditLogFiltersDialog({
  open,
  filters,
  showMapFilter = false,
  onApply,
  onClose,
}: MapAuditLogFiltersDialogProps) {
  const { t } = useTranslation();
  const maps = useMapsListQuery();
  const [draft, setDraft] = useState(() => toDraft(filters));

  useEffect(() => {
    if (open) {
      setDraft(toDraft(filters));
    }
  }, [open, filters]);

  if (!open) {
    return null;
  }

  function handleApply() {
    onApply(fromDraft(draft));
    onClose();
  }

  function handleClear() {
    const cleared: DraftFilters = {
      mapId: "",
      entityType: "",
      action: "",
      source: "",
      entityId: "",
    };
    setDraft(cleared);
    onApply(fromDraft(cleared));
    onClose();
  }

  return (
    <div className="modal-open modal z-[1300]">
      <div className="modal-box max-w-md px-6 py-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h4 className="text-base font-semibold">{t("maps.workspace.auditLogFiltersTitle")}</h4>
          <button type="button" className="btn btn-square btn-ghost btn-sm" onClick={onClose}>
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4">
          {showMapFilter ? (
            <label className="form-control gap-1.5">
              <span className="label-text text-xs font-medium text-base-content/60">
                {t("auditLog.filterMap")}
              </span>
              <select
                className="select-bordered select w-full select-sm"
                value={draft.mapId}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, mapId: event.target.value }))
                }
              >
                <option value="">{t("auditLog.allMaps")}</option>
                {(maps.data ?? []).map((map) => (
                  <option key={map.id} value={map.id}>
                    {map.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="form-control gap-1.5">
            <span className="label-text text-xs font-medium text-base-content/60">
              {t("maps.workspace.auditLogFilterEntityType")}
            </span>
            <select
              className="select-bordered select w-full select-sm"
              value={draft.entityType}
              onChange={(event) =>
                setDraft((current) => ({ ...current, entityType: event.target.value }))
              }
            >
              <option value="">{t("maps.workspace.auditLogAllEntities")}</option>
              <option value="control_point">
                {t("maps.workspace.auditLogEntityControlPoint")}
              </option>
              <option value="geo_segment">{t("maps.workspace.auditLogEntitySegment")}</option>
              <option value="map">{t("maps.workspace.auditLogEntityMap")}</option>
            </select>
          </label>

          <label className="form-control gap-1.5">
            <span className="label-text text-xs font-medium text-base-content/60">
              {t("maps.workspace.auditLogFilterAction")}
            </span>
            <select
              className="select-bordered select w-full select-sm"
              value={draft.action}
              onChange={(event) =>
                setDraft((current) => ({ ...current, action: event.target.value }))
              }
            >
              <option value="">{t("maps.workspace.auditLogAllActions")}</option>
              <option value="create">{t("maps.workspace.auditLogActionCreate")}</option>
              <option value="update">{t("maps.workspace.auditLogActionUpdate")}</option>
              <option value="delete">{t("maps.workspace.auditLogActionDelete")}</option>
            </select>
          </label>

          <label className="form-control gap-1.5">
            <span className="label-text text-xs font-medium text-base-content/60">
              {t("maps.workspace.auditLogFilterSource")}
            </span>
            <select
              className="select-bordered select w-full select-sm"
              value={draft.source}
              onChange={(event) =>
                setDraft((current) => ({ ...current, source: event.target.value }))
              }
            >
              <option value="">{t("maps.workspace.auditLogAllSources")}</option>
              <option value="user">{t("maps.workspace.auditLogSourceUser")}</option>
              <option value="mcp">{t("maps.workspace.auditLogSourceMcp")}</option>
            </select>
          </label>

          <label className="form-control gap-1.5">
            <span className="label-text text-xs font-medium text-base-content/60">
              {t("maps.workspace.auditLogFilterEntityId")}
            </span>
            <input
              type="number"
              min={1}
              className="input-bordered input input-sm w-full"
              value={draft.entityId}
              placeholder={t("maps.workspace.auditLogFilterEntityIdPlaceholder")}
              onChange={(event) =>
                setDraft((current) => ({ ...current, entityId: event.target.value }))
              }
            />
          </label>
        </div>

        <div className="modal-action mt-6">
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleClear}>
            {t("maps.workspace.auditLogClearFilters")}
          </button>
          <button type="button" className="btn btn-sm btn-primary" onClick={handleApply}>
            {t("maps.workspace.auditLogApplyFilters")}
          </button>
        </div>
      </div>
      <button type="button" className="modal-backdrop" onClick={onClose} aria-hidden />
    </div>
  );
}

export function MapAuditLogFilterButton({
  activeCount,
  onClick,
}: {
  activeCount: number;
  onClick: () => void;
}) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      className="btn shrink-0 gap-1.5 btn-outline btn-sm"
      onClick={onClick}
      data-test="audit-log-filters"
    >
      <SlidersHorizontal className="size-3.5" />
      {t("maps.workspace.auditLogFilters")}
      {activeCount > 0 ? <span className="badge badge-xs badge-primary">{activeCount}</span> : null}
    </button>
  );
}
