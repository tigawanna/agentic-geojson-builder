import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { McpStatus } from "../../../../shared/mcp.types";

const mcpStatusQueryKey = ["mcp", "status"] as const;

export function useMcpStatusQuery() {
  return useQuery({
    queryKey: mcpStatusQueryKey,
    queryFn: () => window.api.invoke("mcp:getStatus", undefined),
    refetchInterval: 10_000,
  });
}

export function useMcpEnabledMutation() {
  const queryClient = useQueryClient();

  return {
    async setEnabled(enabled: boolean): Promise<McpStatus> {
      const status = await window.api.invoke("mcp:setEnabled", { enabled });
      queryClient.setQueryData(mcpStatusQueryKey, status);
      return status;
    },
  };
}

export function McpSettingsSection() {
  const { t } = useTranslation();
  const status = useMcpStatusQuery();
  const mcpSettings = useMcpEnabledMutation();
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);

  const configJson = status.data
    ? JSON.stringify(
        {
          mcpServers: {
            "agentic-geojson-desktop": {
              url: status.data.url,
            },
          },
        },
        null,
        2,
      )
    : "";

  return (
    <article className="glass-card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">{t("settings.mcp.heading")}</h3>
          <p className="mt-1 text-sm text-base-content/60">{t("settings.mcp.description")}</p>
        </div>
        <label className="label cursor-pointer gap-3">
          <span className="label-text text-sm">{t("settings.mcp.enabled")}</span>
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={status.data?.enabled ?? true}
            disabled={pending || status.isLoading}
            onChange={async (event) => {
              setPending(true);
              try {
                await mcpSettings.setEnabled(event.target.checked);
              } finally {
                setPending(false);
              }
            }}
          />
        </label>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-box border border-base-content/10 p-4">
          <p className="text-xs font-medium tracking-wide text-base-content/50 uppercase">
            {t("settings.mcp.status")}
          </p>
          <p className="mt-2 font-mono text-sm">
            {status.data?.running ? t("settings.mcp.running") : t("settings.mcp.stopped")}
          </p>
          {status.data?.error ? (
            <p className="mt-2 text-xs text-error">{status.data.error}</p>
          ) : null}
        </div>
        <div className="rounded-box border border-base-content/10 p-4">
          <p className="text-xs font-medium tracking-wide text-base-content/50 uppercase">
            {t("settings.mcp.endpoint")}
          </p>
          <p className="selectable mt-2 font-mono text-sm break-all">{status.data?.url ?? "—"}</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-sm font-medium">{t("settings.mcp.cursorConfig")}</p>
          <button
            type="button"
            className="btn btn-outline btn-xs"
            disabled={!configJson}
            onClick={async () => {
              await navigator.clipboard.writeText(configJson);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? t("settings.mcp.copied") : t("settings.mcp.copy")}
          </button>
        </div>
        <pre className="selectable overflow-x-auto rounded-box border border-base-content/10 bg-base-200/40 p-4 text-xs leading-relaxed text-base-content/70">
          {configJson || "—"}
        </pre>
      </div>
    </article>
  );
}
