import { Outlet, useRouterState } from "@tanstack/react-router";
import { usePageTitle } from "../../hooks/usePageTitle";
import { AppConfig } from "../../utils/system";
import { AppMenuBridge } from "../AppMenuBridge";
import { WorkspaceCaptureBridge } from "../WorkspaceCaptureBridge";
import { UpdateToast } from "../UpdateToast";
import { accountRoutes, primaryRoutes } from "./dashboard-routes";
import { DashboardSidebar, DashboardSidebarTrigger } from "./DashboardSidebar";
import { SidebarProvider, useSidebar } from "./SidebarProvider";

function DashboardShell() {
  const { toggleSidebar, isCollapsed } = useSidebar();
  const pageTitle = usePageTitle();
  const isFullWidth = useRouterState({
    select: (state) => {
      const path = state.location.pathname.replace(/\/$/, "") || "/";
      return /^\/maps\/[^/]+$/.test(path) && path !== "/maps/new";
    },
  });

  return (
    <div className="flex h-screen w-full overflow-hidden bg-base-100 text-base-content">
      <DashboardSidebar
        primaryRoutes={primaryRoutes}
        primaryLabel="Menu"
        accountRoutes={accountRoutes}
        accountLabel="Account"
      />

      <div className="flex min-w-0 flex-1 flex-col bg-grid">
        <header className="drag-region glass-panel sticky top-0 z-20 flex h-14 items-center gap-3 px-4">
          <DashboardSidebarTrigger onClick={toggleSidebar} collapsed={isCollapsed} />
          <div className="no-drag min-w-0 flex-1">
            <p className="truncate text-base font-semibold tracking-tight">{pageTitle}</p>
            <p className="truncate text-xs text-base-content/50">{AppConfig.name}</p>
          </div>
        </header>

        <main
          className={`no-drag min-h-0 flex-1 ${isFullWidth ? "overflow-hidden" : "overflow-y-auto"}`}
        >
          <div
            className={isFullWidth ? "h-full" : "mx-auto w-full max-w-5xl px-6 py-8 pb-12 lg:px-10"}
          >
            <Outlet />
          </div>
        </main>
      </div>

      <UpdateToast />
      <AppMenuBridge />
      <WorkspaceCaptureBridge />
    </div>
  );
}

export function DashboardLayout() {
  return (
    <SidebarProvider>
      <DashboardShell />
    </SidebarProvider>
  );
}
