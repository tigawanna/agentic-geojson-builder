import { Outlet, useRouterState } from "@tanstack/react-router";
import { ApplicationMenuBar } from "@renderer/components/ApplicationMenuBar";
import { DetachedSourceLayout } from "@renderer/components/DetachedSourceLayout";
import { usePageTitle } from "@renderer/hooks/usePageTitle";
import { AppConfig } from "@renderer/utils/system";
import { AppMenuBridge } from "@renderer/components/AppMenuBridge";
import { MapBaseRendererGlobalBridge } from "@renderer/features/maps/components/MapBaseRendererGlobalBridge";
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
  const { hideDashboardHeader, isFullWidth, isFillHeight } = useRouterState({
    select: (state) => {
      const path = state.location.pathname.replace(/\/$/, "") || "/";
      const isMapWorkspace = /^\/maps\/[^/]+$/.test(path) && path !== "/maps/new";
      return {
        hideDashboardHeader: path === "/" || isMapWorkspace,
        isFullWidth: path === "/" || isMapWorkspace,
        isFillHeight: path === "/audit-log",
      };
    },
  });

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-base-100 text-base-content">
      <ApplicationMenuBar />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <DashboardSidebar
          primaryRoutes={primaryRoutes}
          primaryLabel="Menu"
          accountRoutes={accountRoutes}
          accountLabel="Account"
        />

        <div className="flex min-w-0 flex-1 flex-col bg-grid">
          {!hideDashboardHeader ? (
            <header className="drag-region glass-panel sticky top-0 z-20 flex h-14 items-center gap-3 px-4">
              <DashboardSidebarTrigger onClick={toggleSidebar} collapsed={isCollapsed} />
              <div className="no-drag min-w-0 flex-1">
                <p className="truncate text-base font-semibold tracking-tight">{pageTitle}</p>
                <p className="truncate text-xs text-base-content/50">{AppConfig.name}</p>
              </div>
            </header>
          ) : null}

          <main
            className={`no-drag min-h-0 flex-1 ${isFullWidth || isFillHeight ? "overflow-hidden" : "overflow-y-auto"}`}
          >
            <div
              className={
                isFullWidth
                  ? "h-full min-h-0"
                  : isFillHeight
                    ? "mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col px-6 py-4 lg:px-10"
                    : "mx-auto w-full max-w-5xl px-6 py-8 pb-12 lg:px-10"
              }
            >
              <Outlet />
            </div>
          </main>
        </div>

        <UpdateToast />
        <AppMenuBridge />
        <MapBaseRendererGlobalBridge />
        <WorkspaceCaptureBridge />
        <ViewportCommandBridge />
      </div>
    </div>
  );
}

function isDetachedSourceLocation(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, "");
  return /\/maps\/[^/]+\/source$/.test(normalized);
}

export function DashboardLayout() {
  const isDetachedSource = useRouterState({
    select: (state) => isDetachedSourceLocation(state.location.pathname),
  });

  if (isDetachedSource) {
    return <DetachedSourceLayout />;
  }

  return (
    <SidebarProvider>
      <DashboardShell />
    </SidebarProvider>
  );
}
