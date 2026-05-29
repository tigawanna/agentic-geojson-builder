import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useAuditLogQuery } from "@renderer/features/maps/hooks/useAuditLogQuery";

type MapAuditLogModalProps = {
  mapId: number;
  open: boolean;
  onClose: () => void;
};

const PER_PAGE = 20;

const ACTION_BADGE: Record<string, string> = {
  create: "badge-success",
  update: "badge-warning",
  delete: "badge-error",
};

const ENTITY_LABEL: Record<string, string> = {
  control_point: "Control Point",
  geo_segment: "Segment",
  map: "Map",
};

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function summarizeChange(entry: {
  action: string;
  entityType: string;
  entityId: number;
  oldValue: unknown;
  newValue: unknown;
}) {
  const entity = ENTITY_LABEL[entry.entityType] ?? entry.entityType;

  if (entry.action === "create") {
    return `Created ${entity} #${entry.entityId}`;
  }
  if (entry.action === "delete") {
    return `Deleted ${entity} #${entry.entityId}`;
  }

  const oldVal = entry.oldValue as Record<string, unknown> | null;
  const newVal = entry.newValue as Record<string, unknown> | null;
  if (!oldVal || !newVal) {
    return `Updated ${entity} #${entry.entityId}`;
  }

  const changedFields: string[] = [];
  for (const key of Object.keys(newVal)) {
    if (key === "updatedAt" || key === "createdAt") continue;
    if (JSON.stringify(oldVal[key]) !== JSON.stringify(newVal[key])) {
      changedFields.push(key);
    }
  }

  if (changedFields.length === 0) {
    return `Updated ${entity} #${entry.entityId}`;
  }

  const fieldSummary = changedFields.slice(0, 3).join(", ");
  const extra = changedFields.length > 3 ? ` +${changedFields.length - 3} more` : "";
  return `Updated ${entity} #${entry.entityId}: ${fieldSummary}${extra}`;
}

export function MapAuditLogModal({ mapId, open, onClose }: MapAuditLogModalProps) {
  const [page, setPage] = useState(1);
  const [entityFilter, setEntityFilter] = useState<string | undefined>(undefined);

  const query = useAuditLogQuery(mapId, page, PER_PAGE, { entityType: entityFilter });
  const entries = query.data?.entries ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  if (!open) {
    return null;
  }

  return (
    <div className="modal-open modal z-[1200]">
      <div className="modal-box max-h-[88vh] max-w-2xl overflow-y-auto px-6 py-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Audit Log</h3>
          <button type="button" className="btn btn-square btn-ghost btn-sm" onClick={onClose}>
            <X className="size-4" />
          </button>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <select
            className="select-bordered select select-sm"
            value={entityFilter ?? ""}
            onChange={(e) => {
              setEntityFilter(e.target.value || undefined);
              setPage(1);
            }}
          >
            <option value="">All entities</option>
            <option value="control_point">Control Points</option>
            <option value="geo_segment">Segments</option>
            <option value="map">Maps</option>
          </select>
          <span className="text-xs text-base-content/60">
            {total} {total === 1 ? "entry" : "entries"}
          </span>
        </div>

        {query.isLoading && !query.data ? (
          <div className="flex justify-center py-8">
            <span className="loading loading-sm loading-spinner" />
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-box border border-dashed border-base-content/20 px-4 py-8 text-center text-sm text-base-content/50">
            No audit log entries yet. Actions will appear here as you make changes.
          </div>
        ) : (
          <div className="space-y-1">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 rounded-box px-3 py-2 hover:bg-base-200/60"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm">{summarizeChange(entry)}</span>
                  <span className="text-xs text-base-content/50">
                    {formatTimestamp(entry.createdAt)}
                    {entry.source !== "user" ? ` · via ${entry.source}` : ""}
                  </span>
                </div>
                <span className={`badge badge-sm ${ACTION_BADGE[entry.action] ?? "badge-ghost"}`}>
                  {entry.action}
                </span>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 ? (
          <div className="mt-4 flex items-center justify-between border-t border-base-content/10 pt-3">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" />
              Prev
            </button>
            <span className="text-xs text-base-content/60">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
              <ChevronRight className="size-4" />
            </button>
          </div>
        ) : null}
      </div>
      <button type="button" className="modal-backdrop" onClick={onClose} aria-hidden />
    </div>
  );
}
