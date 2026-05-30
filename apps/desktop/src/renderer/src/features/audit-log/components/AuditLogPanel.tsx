import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Map as MapIcon,
  MapPin,
  Route,
  Search,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@renderer/lib/utils";
import {
  countActiveAuditLogFilters,
  MapAuditLogFilterButton,
  MapAuditLogFiltersDialog,
} from "@renderer/features/maps/components/MapAuditLogFiltersDialog";
import {
  type AuditLogFilters,
  useAuditLogQuery,
} from "@renderer/features/maps/hooks/useAuditLogQuery";

export type AuditLogEntry = {
  id: number;
  mapId: number;
  mapName: string | null;
  entityType: string;
  entityId: number;
  action: string;
  oldValue: unknown;
  newValue: unknown;
  source: string;
  createdAt: string;
};

type AuditLogPanelProps = {
  mapId?: number;
  showMapName?: boolean;
  showMapFilter?: boolean;
  fillHeight?: boolean;
  className?: string;
};

const PER_PAGE = 20;

const ACTION_BADGE: Record<string, string> = {
  create: "badge-success",
  update: "badge-warning",
  delete: "badge-error",
};

const ENTITY_ICON: Record<string, typeof MapPin> = {
  control_point: MapPin,
  geo_segment: Route,
  map: MapIcon,
};

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDisplayValue(value: unknown) {
  if (value == null) {
    return "—";
  }
  if (typeof value === "string") {
    return value.length > 120 ? `${value.slice(0, 120)}…` : value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  const json = JSON.stringify(value);
  return json.length > 160 ? `${json.slice(0, 160)}…` : json;
}

function summarizeChange(
  entry: Pick<AuditLogEntry, "action" | "entityType" | "entityId" | "oldValue" | "newValue">,
  entityLabel: string,
) {
  if (entry.action === "create") {
    return `Created ${entityLabel} #${entry.entityId}`;
  }
  if (entry.action === "delete") {
    return `Deleted ${entityLabel} #${entry.entityId}`;
  }

  const oldVal = entry.oldValue as Record<string, unknown> | null;
  const newVal = entry.newValue as Record<string, unknown> | null;
  if (!oldVal || !newVal) {
    return `Updated ${entityLabel} #${entry.entityId}`;
  }

  const changedFields: string[] = [];
  for (const key of Object.keys(newVal)) {
    if (key === "updatedAt" || key === "createdAt") continue;
    if (JSON.stringify(oldVal[key]) !== JSON.stringify(newVal[key])) {
      changedFields.push(key);
    }
  }

  if (changedFields.length === 0) {
    return `Updated ${entityLabel} #${entry.entityId}`;
  }

  const fieldSummary = changedFields.slice(0, 3).join(", ");
  const extra = changedFields.length > 3 ? ` +${changedFields.length - 3} more` : "";
  return `Updated ${entityLabel} #${entry.entityId}: ${fieldSummary}${extra}`;
}

function getFieldChanges(entry: Pick<AuditLogEntry, "action" | "oldValue" | "newValue">) {
  if (entry.action === "create") {
    const value = entry.newValue as Record<string, unknown> | null;
    if (!value) return [];
    return Object.entries(value)
      .filter(([key]) => key !== "updatedAt" && key !== "createdAt")
      .map(([field, next]) => ({ field, previous: null as unknown, next }));
  }

  if (entry.action === "delete") {
    const value = entry.oldValue as Record<string, unknown> | null;
    if (!value) return [];
    return Object.entries(value)
      .filter(([key]) => key !== "updatedAt" && key !== "createdAt")
      .map(([field, previous]) => ({ field, previous, next: null as unknown }));
  }

  const oldVal = entry.oldValue as Record<string, unknown> | null;
  const newVal = entry.newValue as Record<string, unknown> | null;
  if (!oldVal || !newVal) return [];

  return Object.keys(newVal)
    .filter((key) => key !== "updatedAt" && key !== "createdAt")
    .filter((key) => JSON.stringify(oldVal[key]) !== JSON.stringify(newVal[key]))
    .map((field) => ({
      field,
      previous: oldVal[field],
      next: newVal[field],
    }));
}

function AuditLogEntryRow({
  entry,
  entityLabel,
  showMapName,
}: {
  entry: AuditLogEntry;
  entityLabel: string;
  showMapName?: boolean;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const Icon = ENTITY_ICON[entry.entityType] ?? MapIcon;
  const fieldChanges = getFieldChanges(entry);

  return (
    <div className="rounded-box border border-base-content/8 bg-base-100/40">
      <button
        type="button"
        className="flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-base-200/50"
        onClick={() => setExpanded((current) => !current)}
        data-test={`audit-log-entry-${entry.id}`}
      >
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-base-200/80 text-base-content/70">
          <Icon className="size-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{summarizeChange(entry, entityLabel)}</span>
            <span className={`badge badge-sm ${ACTION_BADGE[entry.action] ?? "badge-ghost"}`}>
              {entry.action}
            </span>
          </div>
          <p className="mt-1 text-xs text-base-content/55">
            {formatTimestamp(entry.createdAt)}
            {showMapName ? (
              <>
                {" · "}
                <Link
                  to="/maps/$mapId"
                  params={{ mapId: String(entry.mapId) }}
                  className="link link-hover"
                  onClick={(event) => event.stopPropagation()}
                >
                  {entry.mapName ?? t("auditLog.unknownMap", { id: entry.mapId })}
                </Link>
              </>
            ) : null}
            {entry.source !== "user"
              ? ` · ${t("maps.workspace.auditLogViaSource", { source: entry.source })}`
              : null}
          </p>
        </div>

        <ChevronDown
          className={`mt-1 size-4 shrink-0 text-base-content/45 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded ? (
        <div className="border-t border-base-content/8 px-3 py-3">
          {fieldChanges.length === 0 ? (
            <p className="text-xs text-base-content/50">{t("maps.workspace.auditLogNoDetails")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-xs">
                <thead>
                  <tr className="text-base-content/50">
                    <th>{t("maps.workspace.auditLogField")}</th>
                    <th>{t("maps.workspace.auditLogBefore")}</th>
                    <th>{t("maps.workspace.auditLogAfter")}</th>
                  </tr>
                </thead>
                <tbody>
                  {fieldChanges.map((change) => (
                    <tr key={change.field}>
                      <td className="font-mono text-xs">{change.field}</td>
                      <td className="max-w-48 truncate font-mono text-xs text-base-content/70">
                        {formatDisplayValue(change.previous)}
                      </td>
                      <td className="max-w-48 truncate font-mono text-xs text-base-content/70">
                        {formatDisplayValue(change.next)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function AuditLogPanel({
  mapId,
  showMapName = false,
  showMapFilter = false,
  fillHeight = false,
  className,
}: AuditLogPanelProps) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchTerm(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, filters, mapId]);

  const query = useAuditLogQuery(mapId, page, PER_PAGE, {
    ...filters,
    search: searchTerm || undefined,
  });
  const entries = query.data?.entries ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const activeFilterCount = countActiveAuditLogFilters(filters, {
    includeMapFilter: showMapFilter,
  });

  const entityLabels: Record<string, string> = {
    control_point: t("maps.workspace.auditLogEntityControlPoint"),
    geo_segment: t("maps.workspace.auditLogEntitySegment"),
    map: t("maps.workspace.auditLogEntityMap"),
  };
  const showPagination = total > 0;

  return (
    <>
      <div className={cn(fillHeight && "flex h-full min-h-0 flex-col", className)}>
        <div className="shrink-0">
          <div className="flex items-center gap-2">
            <label className="input-bordered input input-sm flex min-w-0 flex-1 items-center gap-2">
              <Search className="size-3.5 shrink-0 text-base-content/45" />
              <input
                type="search"
                className="min-w-0 grow bg-transparent outline-none"
                value={searchInput}
                placeholder={t("maps.workspace.auditLogSearchPlaceholder")}
                onChange={(event) => setSearchInput(event.target.value)}
                data-test="audit-log-search"
              />
            </label>
            <MapAuditLogFilterButton
              activeCount={activeFilterCount}
              onClick={() => setFiltersOpen(true)}
            />
          </div>

          <p className="mt-2 text-xs text-base-content/50">
            {t("maps.workspace.auditLogEntryCount", { count: total })}
          </p>
        </div>

        <div className={cn(fillHeight ? "mt-3 min-h-0 flex-1 overflow-y-auto" : "mt-3")}>
          {query.isLoading && !query.data ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-md loading-spinner" />
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-box border border-dashed border-base-content/20 px-4 py-8 text-center text-sm text-base-content/50">
              {searchTerm || activeFilterCount > 0
                ? t("maps.workspace.auditLogNoResults")
                : t("maps.workspace.auditLogEmpty")}
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <AuditLogEntryRow
                  key={entry.id}
                  entry={entry}
                  entityLabel={entityLabels[entry.entityType] ?? entry.entityType}
                  showMapName={showMapName}
                />
              ))}
            </div>
          )}
        </div>

        {showPagination ? (
          <div className="mt-3 flex shrink-0 items-center justify-between gap-3 border-t border-base-content/10 pt-3">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              data-test="audit-log-prev"
            >
              <ChevronLeft className="size-4" />
              {t("maps.workspace.auditLogPrev")}
            </button>
            <span className="text-xs text-base-content/60">
              {t("maps.workspace.auditLogPage", { page, total: totalPages })}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              data-test="audit-log-next"
            >
              {t("maps.workspace.auditLogNext")}
              <ChevronRight className="size-4" />
            </button>
          </div>
        ) : null}
      </div>

      <MapAuditLogFiltersDialog
        open={filtersOpen}
        filters={filters}
        showMapFilter={showMapFilter}
        onApply={setFilters}
        onClose={() => setFiltersOpen(false)}
      />
    </>
  );
}
