import { History, Home, Info, Map, Settings } from "lucide-react";
import type { SidebarItem } from "@renderer/components/sidebar/types";

export const primaryRoutes = [
  { title: "Home", href: "/", labelKey: "nav.home", icon: Home },
  { title: "Maps", href: "/maps", labelKey: "nav.maps", icon: Map },
  { title: "History", href: "/audit-log", labelKey: "nav.history", icon: History },
] satisfies SidebarItem[];

export const accountRoutes = [
  { title: "Settings", href: "/settings", labelKey: "nav.settings", icon: Settings },
  { title: "About", href: "/about", labelKey: "nav.about", icon: Info },
] satisfies SidebarItem[];
