import { Outlet, useRouterState } from "@tanstack/react-router";
import { usePageTitle } from "@renderer/hooks/usePageTitle";
import { AppConfig } from "@renderer/utils/system";
import { AppMenuBridge } from "@renderer/components/AppMenuBridge";
import { ViewportCommandBridge } from "@renderer/components/ViewportCommandBridge";
import { WorkspaceCaptureBridge } from "@renderer/components/WorkspaceCaptureBridge";
import { UpdateToast } from "@renderer/components/UpdateToast";
import { accountRoutes, primaryRoutes } from "@renderer/components/sidebar/dashboard-routes";
import {
  DashboardSidebar,
  DashboardSidebarTrigger,
} from "@renderer/components/sidebar/DashboardSidebar";
import { SidebarProvider, useSidebar } from "@renderer/components/sidebar/SidebarProvider";

function DashboardShell() {
  const { toggleSidebar, isCollapsed } = useSidebar();
  const pageTitle = usePageTitle();
  const { isHomePlayground, isFullWidth } = useRouterState({
    select: (state) => {
      const path = state.location.pathname.replace(/\/$/, "") || "/";
      return {
        isHomePlayground: path === "/",
        isFullWidth: path === "/" || (/^\/maps\/[^/]+$/.test(path) && path !== "/maps/new"),
      };
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
        {!isHomePlayground ? (
          <header className="drag-region glass-panel sticky top-0 z-20 flex h-14 items-center gap-3 px-4">
            <DashboardSidebarTrigger onClick={toggleSidebar} collapsed={isCollapsed} />
            <div className="no-drag min-w-0 flex-1">
              <p className="truncate text-base font-semibold tracking-tight">{pageTitle}</p>
              <p className="truncate text-xs text-base-content/50">{AppConfig.name}</p>
            </div>
          </header>
        ) : null}

        <main
          className={`no-drag min-h-0 flex-1 ${isFullWidth ? "overflow-hidden" : "overflow-y-auto"}`}
        >
          <div
            className={
              isFullWidth ? "h-full min-h-0" : "mx-auto w-full max-w-5xl px-6 py-8 pb-12 lg:px-10"
            }
          >
            <Outlet />
          </div>
        </main>
      </div>

      <UpdateToast />
      <AppMenuBridge />
      <WorkspaceCaptureBridge />
      <ViewportCommandBridge />
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
