import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { copyProbeText } from "@renderer/features/maps/lib/mapbox-probe-coordinates";
import { formatReferenceInspectCopyText } from "@renderer/features/maps/lib/reference-inspect-tooltip";
import {
  getReferenceInspectCopyTarget,
  setReferenceInspectCopyTarget,
} from "@renderer/features/maps/lib/reference-inspect-copy-registry";
import { useMapDataExplorerPageStore } from "@renderer/features/maps/store/map-data-explorer-page-store";

export function useDataExplorerInspectCopyShortcut() {
  const { t } = useTranslation();
  const showReferenceInspectTooltip = useMapDataExplorerPageStore(
    (state) => state.showReferenceInspectTooltip,
  );
  const mapboxInspectMode = useMapDataExplorerPageStore((state) => state.mapboxInspectMode);
  const setStatusMessage = useMapDataExplorerPageStore((state) => state.setStatusMessage);
  const statusTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!showReferenceInspectTooltip) {
      setReferenceInspectCopyTarget(null);
    }
  }, [showReferenceInspectTooltip]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "c" && event.key !== "C") {
        return;
      }
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }
      if (event.altKey) {
        return;
      }

      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      const copyTarget = getReferenceInspectCopyTarget();
      if (!copyTarget) {
        return;
      }

      event.preventDefault();
      const text = formatReferenceInspectCopyText(copyTarget);
      void copyProbeText(text).then(() => {
        setStatusMessage(t("maps.workspace.dataExplorer.inspect.copied", { value: text }));
        if (statusTimerRef.current !== undefined) {
          window.clearTimeout(statusTimerRef.current);
        }
        statusTimerRef.current = window.setTimeout(() => setStatusMessage(null), 2500);
      });
    }

    if (!showReferenceInspectTooltip && !mapboxInspectMode) {
      return;
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (statusTimerRef.current !== undefined) {
        window.clearTimeout(statusTimerRef.current);
      }
    };
  }, [mapboxInspectMode, setStatusMessage, showReferenceInspectTooltip, t]);
}
