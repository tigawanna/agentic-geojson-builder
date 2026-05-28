import { useRouterState } from "@tanstack/react-router";
import { accountRoutes, primaryRoutes } from "@renderer/components/sidebar/dashboard-routes";

function normalizePath(path: string): string {
  const base = path.split("?")[0] ?? "";
  if (base.length > 1 && base.endsWith("/")) return base.slice(0, -1);
  return base || "/";
}

export function usePageTitle(): string {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const current = normalizePath(pathname);
  const routes = [...primaryRoutes, ...accountRoutes];

  const exact = routes.find((route) => normalizePath(route.href) === current);
  if (exact) return exact.title;

  const nested = routes.find(
    (route) => route.href !== "/" && current.startsWith(`${normalizePath(route.href)}/`),
  );
  return nested?.title ?? "Desktop";
}
