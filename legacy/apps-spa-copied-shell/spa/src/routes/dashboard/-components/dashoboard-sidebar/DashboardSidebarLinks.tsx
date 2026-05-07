import { SidebarLinks } from "@/components/sidebar/SidebarLinks";
import { SidebarGroup, SidebarGroupLabel } from "@/components/ui/sidebar";
import { dashboard_routes } from "./dashboard_routes";

export function DashboardSidebarLinks() {
  return (
    <SidebarGroup className="bg-base-300 h-full">
      <SidebarGroupLabel className="text-sm font-semibold tracking-wide">
        House keeping
      </SidebarGroupLabel>
      <SidebarLinks links={dashboard_routes} />{" "}
    </SidebarGroup>
  );
}
