import { Info, Home, Newspaper, Settings } from "lucide-react";
import type { SidebarItem } from "./types";

export const primaryRoutes = [
  { title: "Home", href: "/", labelKey: "nav.home", icon: Home },
  { title: "Posts", href: "/posts", labelKey: "nav.posts", icon: Newspaper },
] satisfies SidebarItem[];

export const accountRoutes = [
  { title: "Settings", href: "/settings", labelKey: "nav.settings", icon: Settings },
  { title: "About", href: "/about", labelKey: "nav.about", icon: Info },
] satisfies SidebarItem[];
