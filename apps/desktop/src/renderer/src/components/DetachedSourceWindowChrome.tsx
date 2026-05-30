import { Minus, Square, X } from "lucide-react";
import { useIpcQuery } from "@renderer/hooks/useIpc";
import { ipcInvoke } from "@renderer/hooks/useIpc";

type DetachedSourceWindowChromeProps = {
  title: string;
};

export function DetachedSourceWindowChrome({ title }: DetachedSourceWindowChromeProps) {
  const platform = useIpcQuery("app:getPlatform", undefined);
  const isLinux = platform.data === "linux";

  if (!isLinux) {
    return null;
  }

  return (
    <header className="drag-region flex h-9 shrink-0 items-center border-b border-base-300 bg-base-200">
      <p className="no-drag min-w-0 flex-1 truncate px-3 text-xs font-medium text-base-content/80">
        {title}
      </p>
      <div className="no-drag flex h-full items-stretch">
        <button
          type="button"
          className="inline-flex w-11 items-center justify-center text-base-content/70 transition-colors hover:bg-base-content/10"
          aria-label="Minimize window"
          onClick={() => void ipcInvoke("window:minimize", undefined)}
        >
          <Minus className="size-3.5" />
        </button>
        <button
          type="button"
          className="inline-flex w-11 items-center justify-center text-base-content/70 transition-colors hover:bg-base-content/10"
          aria-label="Maximize window"
          onClick={() => void ipcInvoke("window:toggleMaximize", undefined)}
        >
          <Square className="size-3" />
        </button>
        <button
          type="button"
          className="inline-flex w-11 items-center justify-center text-base-content/70 transition-colors hover:bg-error/20 hover:text-error"
          aria-label="Close window"
          onClick={() => void ipcInvoke("window:close", undefined)}
        >
          <X className="size-3.5" />
        </button>
      </div>
    </header>
  );
}
