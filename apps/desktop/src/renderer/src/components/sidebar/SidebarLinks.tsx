import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { cn } from "@renderer/lib/utils";
import type { SidebarItem } from "@renderer/components/sidebar/types";
import { useSidebar } from "@renderer/components/sidebar/SidebarProvider";

interface SidebarLinksProps {
  links: SidebarItem[];
}

function normalizePath(path: string): string {
  const base = path.split("?")[0] ?? "";
  if (base.length > 1 && base.endsWith("/")) return base.slice(0, -1);
  return base || "/";
}

function hrefMatchesPathname(pathname: string, href: string): boolean {
  const current = normalizePath(pathname);
  const target = normalizePath(href);
  if (current === target) return true;
  if (target === "/") return false;
  return current.startsWith(`${target}/`);
}

export function SidebarLinks({ links }: SidebarLinksProps) {
  const { t } = useTranslation();
  const { isCollapsed } = useSidebar();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  if (links.length === 0) return null;

  return (
    <ul className="flex flex-col gap-1">
      {links.map((item) => {
        const isActive = hrefMatchesPathname(pathname, item.href);
        const label = item.labelKey ? t(item.labelKey) : item.title;
        const Icon = item.icon;

        return (
          <li key={item.href}>
            <Link
              to={item.href}
              activeOptions={item.href === "/" ? { exact: true } : undefined}
              title={isCollapsed ? label : undefined}
              className={cn(
                "sidebar-link no-drag",
                isActive ? "sidebar-link-active" : "sidebar-link-idle",
                isCollapsed && "justify-center px-2",
              )}
            >
              {isActive && !isCollapsed ? (
                <span className="absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-full bg-primary" />
              ) : null}
              {Icon ? (
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                    isActive ? "bg-primary/15 text-primary" : "bg-base-100/60 text-base-content/70",
                  )}
                >
                  <Icon className="size-4" />
                </span>
              ) : null}
              {!isCollapsed ? <span className="truncate">{label}</span> : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
