import { useTranslation } from "react-i18next";
import { useUpdater } from "../hooks/useUpdater";

export function UpdateToast() {
  const { status, downloadUpdate, quitAndInstall } = useUpdater();
  const { t } = useTranslation();

  if (!status || status.state === "not-available") return null;

  let body: string = "";
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
    <div className="fixed bottom-4 right-4 z-50 flex max-w-sm items-center gap-3 rounded-lg border border-neutral-200 bg-white/90 px-4 py-3 text-sm shadow-lg backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
      <span className="flex-1">{body}</span>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
