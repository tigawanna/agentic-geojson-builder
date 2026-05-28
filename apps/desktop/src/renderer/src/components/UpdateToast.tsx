import { useTranslation } from "react-i18next";
import { useUpdater } from "@renderer/hooks/useUpdater";

export function UpdateToast() {
  const { status, downloadUpdate, quitAndInstall } = useUpdater();
  const { t } = useTranslation();

  if (!status || status.state === "not-available") return null;

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
    </div>
  );
}
