import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "../../lib/utils";
import { SidebarLinks } from "./SidebarLinks";
import { DashboardSidebarFooter } from "./DashboardSidebarFooter";
import { DashboardSidebarHeader } from "./DashboardSidebarHeader";
import { useSidebar } from "./SidebarProvider";
import type { SidebarItem } from "./types";

interface DashboardSidebarProps {
  primaryRoutes: SidebarItem[];
  primaryLabel: string;
  accountRoutes: SidebarItem[];
  accountLabel: string;
}

export function DashboardSidebar({
  primaryRoutes,
  primaryLabel,
  accountRoutes,
  accountLabel,
}: DashboardSidebarProps) {
  const { isCollapsed } = useSidebar();

  return (
    <aside
      className={cn(
        "relative flex h-full shrink-0 flex-col border-r border-sidebar-border bg-linear-to-b from-base-200 via-base-200 to-base-100 shadow-[inset_-1px_0_0_color-mix(in_oklch,var(--color-base-content)_6%,transparent)] transition-[width] duration-300 ease-out",
        isCollapsed ? "w-[4.5rem]" : "w-72",
      )}
    >
      <div className="drag-region px-3 pt-4 pb-3">
        <DashboardSidebarHeader />
      </div>

      <div className="no-drag flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-2">
        <section className="sidebar-section">
          {!isCollapsed ? (
            <p className="mb-2 px-2 text-[10px] font-semibold tracking-[0.14em] text-base-content/45 uppercase">
              {primaryLabel}
            </p>
          ) : null}
          <SidebarLinks links={primaryRoutes} />
        </section>

        <section className="sidebar-section">
          {!isCollapsed ? (
            <p className="mb-2 px-2 text-[10px] font-semibold tracking-[0.14em] text-base-content/45 uppercase">
              {accountLabel}
            </p>
          ) : null}
          <SidebarLinks links={accountRoutes} />
        </section>
      </div>

      <div className="drag-region px-3 pt-2 pb-4">
        <DashboardSidebarFooter />
      </div>
    </aside>
  );
}

interface DashboardSidebarTriggerProps {
  onClick: () => void;
  collapsed: boolean;
}

export function DashboardSidebarTrigger({ onClick, collapsed }: DashboardSidebarTriggerProps) {
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <button
      type="button"
      className="no-drag btn btn-square btn-ghost btn-sm hover:bg-primary/10"
      onClick={onClick}
      aria-label="Toggle sidebar"
    >
      <Icon className="size-4" />
    </button>
  );
}
