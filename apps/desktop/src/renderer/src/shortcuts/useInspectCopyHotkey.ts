import { useEffect } from "react";
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
  statusToastMs?: number | null;
};

export function useInspectCopyHotkey({
  enabled,
  showReferenceInspectTooltip,
  setStatusMessage,
  copiedMessageKey,
  statusToastMs = 5000,
}: UseInspectCopyHotkeyOptions) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!showReferenceInspectTooltip) {
      setReferenceInspectCopyTarget(null);
    }
  }, [showReferenceInspectTooltip]);

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
        if (statusToastMs != null) {
          window.setTimeout(() => setStatusMessage(null), statusToastMs);
        }
      });
    },
    { enabled },
  );
}
