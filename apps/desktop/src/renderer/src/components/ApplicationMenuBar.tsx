import {
  APPLICATION_MENU_TOP_LEVELS,
  type ApplicationMenuTopLevelLabel,
} from "@shared/application-menu.types";
import { useIpcQuery, ipcInvoke } from "@renderer/hooks/useIpc";

function openSubmenu(label: ApplicationMenuTopLevelLabel, anchor: HTMLElement) {
  const rect = anchor.getBoundingClientRect();
  void ipcInvoke("app:popupApplicationSubmenu", {
    label,
    x: rect.left,
    y: rect.bottom,
  });
}

export function ApplicationMenuBar() {
  const platform = useIpcQuery("app:getPlatform", undefined);

  if (platform.data === "darwin" || platform.data === undefined) {
    return null;
  }

  return (
    <header
      className="drag-region flex h-8 shrink-0 items-stretch border-b border-base-content/10 bg-base-200/95 text-xs text-base-content/85"
      data-test="application-menu-bar"
    >
      <nav className="no-drag flex items-stretch gap-0.5 px-1" aria-label="Application menu">
        {APPLICATION_MENU_TOP_LEVELS.map((label) => (
          <button
            key={label}
            type="button"
            className="rounded-sm px-2.5 transition-colors hover:bg-base-content/10 hover:text-base-content"
            onClick={(event) => openSubmenu(label, event.currentTarget)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="min-w-0 flex-1" />
    </header>
  );
}
