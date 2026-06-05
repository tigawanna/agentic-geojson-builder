import { useEffect } from "react";
import { ipcInvoke } from "@renderer/hooks/useIpc";
import { useMapWorkspaceUiActions } from "@renderer/features/maps/store/MapWorkspaceProvider";

export const NEIGHBOR_COVERAGE_STORE_KEY = "maps.showNeighborCoverage";

export function usePersistedNeighborCoveragePreference() {
  const { setShowNeighborCoverage } = useMapWorkspaceUiActions();

  useEffect(() => {
    void ipcInvoke("store:get", { key: NEIGHBOR_COVERAGE_STORE_KEY }).then((value) => {
      if (typeof value === "boolean") {
        setShowNeighborCoverage(value);
      }
    });
  }, [setShowNeighborCoverage]);
}
