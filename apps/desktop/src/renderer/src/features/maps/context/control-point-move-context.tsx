import { createContext, useContext, type ReactNode } from "react";
import { useControlPointMoveHandlers } from "@renderer/features/maps/hooks/useControlPointMoveHandlers";
import { useMapWorkspaceState } from "@renderer/features/maps/store/MapWorkspaceProvider";

type ControlPointMoveContextValue = {
  handleControlPointPdfMove: (controlPointId: number, imageX: number, imageY: number) => void;
  handleControlPointMapMove: (controlPointId: number, latitude: number, longitude: number) => void;
};

const ControlPointMoveContext = createContext<ControlPointMoveContextValue | null>(null);

export function ControlPointMoveBridge({ children }: { children: ReactNode }) {
  const mapId = useMapWorkspaceState((state) => state.workspace?.id ?? null);
  const handlers = useControlPointMoveHandlers(mapId);

  return (
    <ControlPointMoveContext.Provider value={handlers}>{children}</ControlPointMoveContext.Provider>
  );
}

export function useControlPointMove(): ControlPointMoveContextValue {
  const context = useContext(ControlPointMoveContext);
  if (!context) {
    throw new Error("useControlPointMove requires ControlPointMoveBridge");
  }
  return context;
}
