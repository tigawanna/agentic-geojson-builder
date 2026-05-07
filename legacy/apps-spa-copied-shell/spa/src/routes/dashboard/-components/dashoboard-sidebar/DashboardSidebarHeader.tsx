import { useSidebar } from "@/components/ui/sidebar";
import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";

export function DashboardSidebarHeader() {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const { pathname } = useLocation();

  return (
    <div
      className="flex flex-col gap-3"
      onClick={() => {
        setOpenMobile(false);
      }}
    >
      <Link
        to="/dashboard"
        className={
          pathname === "/dashboard"
            ? `bg-primary/10 text-primary flex w-full cursor-pointer items-center gap-2 rounded-lg p-1 font-medium`
            : `hover:bg-base-300 flex w-full cursor-pointer items-center gap-2 rounded-sm p-1`
        }
      >
        <LayoutDashboard className="size-5" />
        {(state === "expanded" || isMobile) && <h1 className="text-sm font-semibold">Dashboard</h1>}
      </Link>
    </div>
  );
}
