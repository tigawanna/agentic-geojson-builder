import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { SHORTCUT_IDS } from "@shared/shortcuts";
import { copyProbeText } from "@renderer/features/maps/lib/mapbox-probe-coordinates";
import { formatReferenceInspectCopyText } from "@renderer/features/maps/lib/reference-inspect-tooltip";
import {
  getReferenceInspectCopyTarget,
  setReferenceInspectCopyTarget,
} from "@renderer/features/maps/lib/reference-inspect-copy-registry";
import { useAppShortcut } from "@renderer/shortcuts/useAppShortcut";

type UseInspectCopyHotkeyOptions = {
  enabled: boolean;
  showReferenceInspectTooltip: boolean;
  setStatusMessage: (message: string | null) => void;
  copiedMessageKey: string;
};

export function useInspectCopyHotkey({
  enabled,
  showReferenceInspectTooltip,
  setStatusMessage,
  copiedMessageKey,
}: UseInspectCopyHotkeyOptions) {
  const { t } = useTranslation();
  const statusTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!showReferenceInspectTooltip) {
      setReferenceInspectCopyTarget(null);
    }
  }, [showReferenceInspectTooltip]);

  useEffect(() => {
    return () => {
      if (statusTimerRef.current !== undefined) {
        window.clearTimeout(statusTimerRef.current);
      }
    };
  }, []);

  useAppShortcut(
    SHORTCUT_IDS.copyInspectCoordinates,
    () => {
      const copyTarget = getReferenceInspectCopyTarget();
      if (!copyTarget) {
        return;
      }

      const text = formatReferenceInspectCopyText(copyTarget);
      void copyProbeText(text).then(() => {
        setStatusMessage(t(copiedMessageKey, { value: text }));
        if (statusTimerRef.current !== undefined) {
          window.clearTimeout(statusTimerRef.current);
        }
        statusTimerRef.current = window.setTimeout(() => setStatusMessage(null), 2500);
      });
    },
    { enabled },
  );
}
