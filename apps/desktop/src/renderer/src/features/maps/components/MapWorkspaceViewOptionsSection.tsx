import { useTranslation } from "react-i18next";
import { ipcInvoke } from "@renderer/hooks/useIpc";
import { useReferenceGeoJsonQuery } from "@renderer/features/maps/hooks/useReferenceGeoJsonQuery";
import { CONTROL_POINT_DRAG_STORE_KEY } from "@renderer/features/maps/hooks/usePersistedControlPointDragPreference";
import {
  useMapWorkspaceState,
  useMapWorkspaceUiActions,
  useMapWorkspaceUiState,
} from "@renderer/features/maps/store/MapWorkspaceProvider";

const REFERENCE_INSPECT_TOOLTIP_STORE_KEY = "maps.referenceInspectTooltip";

export function MapWorkspaceViewOptionsSection() {
  const { t } = useTranslation();
  const workspace = useMapWorkspaceState((state) => state.workspace);
  const showReferenceOverlay = useMapWorkspaceUiState((state) => state.showReferenceOverlay);
  const showReferenceInspectTooltip = useMapWorkspaceUiState(
    (state) => state.showReferenceInspectTooltip,
  );
  const controlPointDragEnabled = useMapWorkspaceUiState((state) => state.controlPointDragEnabled);
  const { setShowReferenceOverlay, setShowReferenceInspectTooltip, setControlPointDragEnabled } =
    useMapWorkspaceUiActions();
  const referenceGeoJsonQuery = useReferenceGeoJsonQuery(workspace?.id ?? null);
  const hasReferenceGeoJson = (referenceGeoJsonQuery.data?.layers.length ?? 0) > 0;

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
        {t("maps.workspace.toolsPanel.viewHeading")}
      </h3>
      <div className="flex flex-col gap-1">
        {hasReferenceGeoJson ? (
          <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-base-content/5">
            <input
              type="checkbox"
              className="checkbox checkbox-xs"
              checked={showReferenceOverlay}
              onChange={() => setShowReferenceOverlay(!showReferenceOverlay)}
            />
            {t("maps.workspace.quickMenu.referenceOverlay")}
          </label>
        ) : null}
        <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-base-content/5">
          <input
            type="checkbox"
            className="checkbox checkbox-xs"
            checked={showReferenceInspectTooltip}
            onChange={() => {
              const next = !showReferenceInspectTooltip;
              setShowReferenceInspectTooltip(next);
              void ipcInvoke("store:set", {
                key: REFERENCE_INSPECT_TOOLTIP_STORE_KEY,
                value: next,
              });
            }}
          />
          {t("maps.workspace.quickMenu.trailInspectTooltip")}
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-base-content/5">
          <input
            type="checkbox"
            className="checkbox checkbox-xs"
            checked={controlPointDragEnabled}
            onChange={() => {
              const next = !controlPointDragEnabled;
              setControlPointDragEnabled(next);
              void ipcInvoke("store:set", { key: CONTROL_POINT_DRAG_STORE_KEY, value: next });
            }}
          />
          {t("maps.workspace.quickMenu.dragReferencePoints")}
        </label>
      </div>
    </section>
  );
}
