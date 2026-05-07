import { SidebarItem } from "@/components/sidebar/types";
import { LayoutDashboard, Map, MapPinned, Settings, Upload } from "lucide-react";

export const dashboard_account_routes = [
  { title: "Settings", href: "/settings", icon: Settings },
] satisfies SidebarItem[];

export const dashboard_admin_routes = [] satisfies SidebarItem[];

export function getDashboardPrimaryRoutes(): SidebarItem[] {
  return [
    { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { title: "Map Projects", href: "/map-projects", icon: MapPinned },
    { title: "Uploads", href: "/map-projects", icon: Upload },
    { title: "GeoJSON Editor", href: "/map-projects", icon: Map },
  ];
}

export const dashboard_routes = [
  ...getDashboardPrimaryRoutes(),
  ...dashboard_account_routes,
  ...dashboard_admin_routes,
] satisfies SidebarItem[];
