import { dashboard_routes } from "@/routes/dashboard/-components/dashoboard-sidebar/dashboard_routes";
import { Home, Store, User } from "lucide-react";

export const routes = [
  {
    title: "Home",
    href: "/",
    icon: Home,
    sublinks: undefined,
  },
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Store,
    sublinks: dashboard_routes,
  },
  {
    title: "Profile",
    href: "/profile",
    icon: User,
    sublinks: undefined,
  },
] as const;
