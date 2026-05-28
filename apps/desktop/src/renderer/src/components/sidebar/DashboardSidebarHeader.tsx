import { Link } from "@tanstack/react-router";
import { AppConfig } from "@renderer/utils/system";
import { cn } from "@renderer/lib/utils";
import { useSidebar } from "@renderer/components/sidebar/SidebarProvider";

export function DashboardSidebarHeader() {
  const { isCollapsed } = useSidebar();
  const Icon = AppConfig.icon;

  return (
    <div className="no-drag">
      <Link
        to="/"
        className={cn(
          "group flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-primary/8",
          isCollapsed && "justify-center",
        )}
        title={AppConfig.name}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary shadow-sm ring-1 ring-primary/15 transition-transform group-hover:scale-105">
          <Icon className="size-5" />
        </span>
        {!isCollapsed ? (
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold tracking-tight">
              {AppConfig.wordmark}
              <span className="text-primary">.</span>
            </p>
            <p className="truncate text-[11px] text-base-content/55">{AppConfig.name}</p>
          </div>
        ) : null}
      </Link>
    </div>
  );
}
