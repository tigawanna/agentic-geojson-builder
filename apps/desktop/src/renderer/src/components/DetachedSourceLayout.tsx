import { Outlet } from "@tanstack/react-router";
import { AppMenuBridge } from "@renderer/components/AppMenuBridge";
import { WorkspaceCaptureBridge } from "@renderer/components/WorkspaceCaptureBridge";

export function DetachedSourceLayout() {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-base-200 text-base-content">
      <main className="min-h-0 flex-1">
        <Outlet />
      </main>
      <AppMenuBridge />
      <WorkspaceCaptureBridge />
    </div>
  );
}
