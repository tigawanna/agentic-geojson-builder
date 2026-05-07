import { SidebarItem } from "@/components/sidebar/types";
import { NotepadText, ShieldCheck, Store, Wallet } from "lucide-react";

export const dashboard_routes = [
  { title: "One", href: "/dashboard/one", icon: Wallet },
  { title: "Two", href: "/dashboard/two", icon: NotepadText },
  { title: "Three", href: "/dashboard/three", icon: Store },
  { title: "Four", href: "/dashboard/four", icon: ShieldCheck },
] satisfies SidebarItem[];
