import { SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MapWorkspaceQuickMenuItem } from "@shared/menu.types";
import { ipcInvoke } from "@renderer/hooks/useIpc";
import { useReferenceGeoJsonQuery } from "@renderer/features/maps/hooks/useReferenceGeoJsonQuery";
import {
  useMapWorkspaceState,
  useMapWorkspaceUiState,
} from "@renderer/features/maps/store/MapWorkspaceProvider";

export function MapWorkspaceQuickMenuButton() {
  const { t } = useTranslation();
  const workspace = useMapWorkspaceState((state) => state.workspace);
  const showReferenceOverlay = useMapWorkspaceUiState((state) => state.showReferenceOverlay);
  const showReferenceInspectTooltip = useMapWorkspaceUiState(
    (state) => state.showReferenceInspectTooltip,
  );
  const controlPointDragEnabled = useMapWorkspaceUiState((state) => state.controlPointDragEnabled);
  const referenceGeoJsonQuery = useReferenceGeoJsonQuery(workspace?.id ?? null);

  const hasReferenceGeoJson = (referenceGeoJsonQuery.data?.layers.length ?? 0) > 0;

  async function openQuickMenu(event: React.MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const items: MapWorkspaceQuickMenuItem[] = [
      {
        id: "reference-inspect-tooltip",
        label: t("maps.workspace.quickMenu.trailInspectTooltip"),
        checked: showReferenceInspectTooltip,
      },
      {
        id: "control-point-drag",
        label: t("maps.workspace.quickMenu.dragReferencePoints"),
        checked: controlPointDragEnabled,
      },
    ];

    if (hasReferenceGeoJson) {
      items.unshift({
        id: "reference-overlay",
        label: t("maps.workspace.quickMenu.referenceOverlay"),
        checked: showReferenceOverlay,
      });
    }

    await ipcInvoke("app:showMapWorkspaceQuickMenu", {
      x: Math.round(rect.left),
      y: Math.round(rect.bottom + 4),
      items,
    });
  }

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-md border border-base-content/12 bg-base-100/80 px-2.5 py-1 text-xs font-medium text-base-content/75 shadow-sm transition-colors hover:bg-base-content/8 hover:text-base-content"
      onClick={(event) => void openQuickMenu(event)}
      aria-label={t("maps.workspace.quickMenu.open")}
      title={t("maps.workspace.quickMenu.open")}
      data-test="workspace-quick-menu"
    >
      <SlidersHorizontal className="size-3.5" />
      {t("maps.workspace.quickMenu.label")}
    </button>
  );
}
