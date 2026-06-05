import { useEffect } from "react";

export const APP_STATUS_TOAST_MS = 2500;

type AppStatusToastProps = {
  message: string | null;
  onDismiss: () => void;
  durationMs?: number;
};

export function AppStatusToast({
  message,
  onDismiss,
  durationMs = APP_STATUS_TOAST_MS,
}: AppStatusToastProps) {
  useEffect(() => {
    if (!message) {
      return;
    }
    const timer = window.setTimeout(onDismiss, durationMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [durationMs, message, onDismiss]);

  if (!message) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed top-4 left-1/2 z-1400 max-w-lg -translate-x-1/2 rounded-lg bg-base-content px-4 py-2 text-center text-xs text-base-100 shadow-lg">
      {message}
    </div>
  );
}
