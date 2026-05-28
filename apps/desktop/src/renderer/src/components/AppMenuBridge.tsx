import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { CreateMapProjectModal } from "../features/maps/components/CreateMapProjectModal";
import { useAppMenuActions } from "../hooks/useAppMenuActions";

export function AppMenuBridge() {
  useAppMenuActions();

  const navigate = useNavigate();
  const activeMapId = useRouterState({
    select: (state) => {
      const match = state.location.pathname.match(/^\/maps\/(\d+)/);
      return match ? Number(match[1]) : null;
    },
  });

  useEffect(() => {
    return window.api.on("maps:changed", (event) => {
      if (event.reason === "deleted" && activeMapId === event.mapId) {
        void navigate({ to: "/maps" });
      }
    });
  }, [activeMapId, navigate]);

  return <CreateMapProjectModal />;
}
