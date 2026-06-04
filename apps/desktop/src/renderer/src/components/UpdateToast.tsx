import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUpdater } from "@renderer/hooks/useUpdater";

const ERROR_AUTO_DISMISS_MS = 5_000;

export function UpdateToast() {
  const { status, downloadUpdate, quitAndInstall } = useUpdater();
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
  }, [status?.state, status?.error, status?.version]);

  useEffect(() => {
    if (status?.state !== "error" || dismissed) {
      return;
    }
    const timeoutId = window.setTimeout(() => setDismissed(true), ERROR_AUTO_DISMISS_MS);
    return () => window.clearTimeout(timeoutId);
  }, [dismissed, status?.state]);

  if (!status || status.state === "not-available" || dismissed) {
    return null;
  }

  let body = "";
  let action: { label: string; onClick: () => void } | null = null;

  switch (status.state) {
    case "checking":
      body = t("updater.checking");
      break;
    case "available":
      body = t("updater.available", { version: status.version });
      action = { label: t("updater.download"), onClick: () => void downloadUpdate() };
      break;
    case "downloading":
      body = t("updater.downloading", {
        percent: status.progress ? Math.round(status.progress.percent) : 0,
      });
      break;
    case "downloaded":
      body = t("updater.downloaded", { version: status.version });
      action = { label: t("updater.install"), onClick: () => void quitAndInstall() };
      break;
    case "error":
      body = t("updater.error", { error: status.error ?? "unknown" });
      break;
    default:
      return null;
  }

  return (
    <div className="glass-card fixed right-4 bottom-4 z-50 flex max-w-sm items-center gap-3 px-4 py-3 text-sm shadow-lg">
      <span className="flex-1">{body}</span>
      {action ? (
        <button type="button" onClick={action.onClick} className="btn btn-xs btn-primary">
          {action.label}
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="btn btn-square btn-ghost btn-xs"
        aria-label={t("updater.dismiss")}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
