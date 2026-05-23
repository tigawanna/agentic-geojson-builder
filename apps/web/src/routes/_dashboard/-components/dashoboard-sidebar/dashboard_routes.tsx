import { SidebarItem } from "@/components/sidebar/types";
import { LayoutDashboard, Map, Settings } from "lucide-react";

export const dashboard_account_routes = [
  { title: "Settings", href: "/settings", icon: Settings },
] satisfies SidebarItem[];

export const dashboard_admin_routes = [] satisfies SidebarItem[];

export function getDashboardPrimaryRoutes(): SidebarItem[] {
  return [
    { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { title: "Maps", href: "/maps", icon: Map },
  ];
}

export const dashboard_routes = [
  ...getDashboardPrimaryRoutes(),
  ...dashboard_account_routes,
  ...dashboard_admin_routes,
] satisfies SidebarItem[];
